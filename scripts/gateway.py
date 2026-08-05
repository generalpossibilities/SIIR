#!/usr/bin/env python3
"""
SIIR gateway - serves on-chain company content to a browser.

Reads a CompanySIIR contract through the Acki Nacki mirror node (via
tvm-cli getters) and serves:

  GET /                                   index of known companies
  GET /company/<dapp_id>::<account_id>/   company page (UI bundle if stored, else showcase)
  GET /company/<addr>/app                 raw UI bundle (text/html)
  GET /company/<addr>/logo                company logo (on-chain)
  GET /company/<addr>/deed                SIIR deed image (on-chain)
  GET /company/<addr>/info                getCompanyInfo as JSON
  GET /company/<addr>/charter             charter + ratification as JSON
  GET /company/<addr>/explore             explorer: register, plans, tracks, search
  GET /company/<addr>/full                company + treasury + plans as JSON
  GET /company/<addr>/register.json       paginated SIIR register (?offset=&limit=)
  GET /company/<addr>/holders.json        holders aggregated from the register
  GET /company/<addr>/holder/<owner>      holder page (also /holder.json/<owner>)
  GET /company/<addr>/siir/<id>           SIIR page (also /siir.json/<id>)
  GET /company/<addr>/plans, /treasury, /history/<id>   JSON
  GET /company/<addr>/search?q=...        address -> holder page; else label/metadata/owner scan

Everything served here is stored on-chain; nothing is cached by us for
longer than a few seconds.

Usage:  python3 scripts/gateway.py [--port 8000] [--net shellnet.ackinacki.org]
Requires: tvm-cli on PATH and the repo's contracts/ for ABIs.
"""

import argparse
import base64
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CT = os.path.join(ROOT, "contracts")
WORK = os.path.join(ROOT, "scripts", ".work")
COMPANIES_JSON = os.path.join(WORK, "companies.json")
COMPANY_ABI = os.path.join(CT, "CompanySIIR.abi.json")

CACHE = {}
CACHE_LOCK = threading.Lock()
CACHE_TTL = 5.0  # seconds

NET = None
DEBUG = False


def log(msg):
    if DEBUG:
        sys.stderr.write(f"[gateway] {msg}\n")


def tvm_cli(*args):
    return subprocess.run(
        ["tvm-cli", "-j", "-u", NET, *args],
        capture_output=True,
        text=True,
        timeout=30,
    )


def run_getter(address, method, params="{}"):
    key = (address, method, params)
    now = time.time()
    with CACHE_LOCK:
        hit = CACHE.get(key)
        if hit and now - hit[0] < CACHE_TTL:
            return hit[1]
    out = tvm_cli("run", address, method, params, "--abi", COMPANY_ABI)
    try:
        data = json.loads(out.stdout)
    except json.JSONDecodeError:
        log(f"{method}@{address}: bad json: {out.stdout[:200]}")
        data = None
    with CACHE_LOCK:
        CACHE[key] = (now, data)
    # keep cache small
    while len(CACHE) > 128:
        CACHE.pop(next(iter(CACHE)), None)
    return data


def load_companies():
    if not os.path.exists(COMPANIES_JSON):
        return []
    try:
        with open(COMPANIES_JSON) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return []
    if isinstance(data, dict):
        data = data.get("companies", [])
    return data if isinstance(data, list) else []


def decode_data_uri(uri):
    """data:<mime>;base64,<data> -> (mime, bytes) or (None, None)."""
    if not uri:
        return None, None
    m = re.match(r"data:([^;]+);base64,(.*)$", uri, re.S)
    if not m:
        return None, None
    try:
        return m.group(1), base64.b64decode(m.group(2))
    except Exception:
        return None, None


def escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def as_int(v, default=0):
    if v is None:
        return default
    try:
        return int(v, 0)
    except (ValueError, TypeError):
        return default


def parse_owner(raw):
    raw = raw.strip()
    if re.fullmatch(r"0:[0-9a-fA-F]{64}", raw):
        return raw
    if re.fullmatch(r"[0-9a-fA-F]{64}", raw):
        return "0:" + raw.lower()
    m = re.fullmatch(r"[0-9a-fA-F]{64}::[0-9a-fA-F]{64}", raw)
    if m:
        return "0:" + m.group(2).lower()
    return None


def siir_row(addr, id):
    d = run_getter(addr, "getSIIR", '{"id":%d}' % id) or {}
    if d.get("weight") is None:
        return None
    return {
        "id": id,
        "weight": d.get("weight"),
        "owner": d.get("owner"),
        "createdAt": d.get("createdAt"),
        "round": d.get("round"),
        "label": d.get("label"),
        "metadataUri": d.get("metadataUri"),
    }


def fetch_rows(addr, ids, budget=25.0):
    """getSIIR for each id in the given iterable, via a small thread pool."""
    rows, t0 = [], time.time()
    ids = list(ids)
    if not ids:
        return rows, False
    submitted = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = set()
        for i in ids:
            if time.time() - t0 > budget:
                break
            while len(futs) >= 8:
                done, _ = concurrent.futures.wait(
                    futs, return_when=concurrent.futures.FIRST_COMPLETED
                )
                for f in done:
                    row = f.result()
                    if row:
                        rows.append(row)
                    futs.discard(f)
            futs.add(ex.submit(siir_row, addr, i))
            submitted += 1
        while futs:
            done, _ = concurrent.futures.wait(
                futs, return_when=concurrent.futures.FIRST_COMPLETED
            )
            for f in done:
                row = f.result()
                if row:
                    rows.append(row)
                futs.discard(f)
    rows.sort(key=lambda r: r["id"])
    return rows, submitted < len(ids)


def scan_siirs(addr, start, end, budget=25.0):
    """getSIIR for each id in [start, end) using a small thread pool."""
    return fetch_rows(addr, range(start, end), budget)


def register_data(addr, qs):
    info = run_getter(addr, "getCompanyInfo") or {}
    total = max(0, as_int(info.get("nextId")) - 1)
    offset = max(0, int((qs.get("offset") or ["0"])[0] or 0))
    limit = min(100, max(1, int((qs.get("limit") or ["25"])[0] or 25)))
    end = min(total + 1, offset + limit + 1)
    rows, truncated = scan_siirs(addr, offset + 1, end)
    return {"total": total, "offset": offset, "limit": limit,
            "truncated": truncated, "rows": rows}


def holders_data(addr):
    info = run_getter(addr, "getCompanyInfo") or {}
    total = max(0, as_int(info.get("nextId")) - 1)
    rows, truncated = scan_siirs(addr, 1, total + 1)
    holders = {}
    for r in rows:
        h = holders.setdefault(r["owner"], {"count": 0, "weight": 0})
        h["count"] += 1
        h["weight"] += as_int(r.get("weight"))
    return {"total": total, "truncated": truncated, "holders": holders}


def holder_data(addr, owner_raw):
    owner = parse_owner(owner_raw)
    if owner is None:
        return {"error": "bad owner (want 64-hex, 0:64-hex, or dapp::acct)"}
    info = run_getter(addr, "getCompanyInfo") or {}
    out = run_getter(addr, "getSIIRsOf", '{"owner":"%s"}' % owner) or {}
    ids = [int(i, 16) for i in out.get("ids", [])]
    rows, _trunc = fetch_rows(addr, ids)
    claim = run_getter(addr, "getClaimableOf", '{"owner":"%s"}' % owner) or {}
    return {
        "owner": owner,
        "company": info.get("name", ""),
        "balance": str(as_int((run_getter(addr, "getBalanceOf", '{"owner":"%s"}' % owner)
                               or {}).get("count"))),
        "siirs": rows,
        "claimable": list(zip(claim.get("currencies", []), claim.get("amounts", []))),
    }


def siir_data(addr, id_s):
    try:
        sid = int(id_s)
    except ValueError:
        return {"error": "bad id"}
    s = run_getter(addr, "getSIIR", '{"id":%d}' % sid) or {}
    fp = run_getter(addr, "getFingerprint", '{"id":%d}' % sid) or {}
    cl = run_getter(addr, "getClaimable", '{"id":%d}' % sid) or {}
    h = run_getter(addr, "getHistory", '{"id":%d}' % sid) or {}
    out = {"id": sid, "fingerprint": fp.get("fp", "")}
    for k in ("weight", "owner", "createdAt", "round", "label", "metadataUri"):
        out[k] = s.get(k)
    out["claimable"] = list(zip(cl.get("currencies", []), cl.get("amounts", [])))
    out["history"] = h.get("entries", [])
    return out


def full_data(addr):
    divs = run_getter(addr, "getDividendCurrencies") or {}
    ci = run_getter(addr, "getContentInfo") or {}
    ver = run_getter(addr, "getVersion") or {}
    return {
        "company": run_getter(addr, "getCompanyInfo") or {},
        "treasury": list(zip(divs.get("ids", []), divs.get("indices", []),
                             divs.get("deposits", []))),
        "plans": (run_getter(addr, "getPlans") or {}).get("plans", []),
        "content": ci,
        "version": ver.get("value0", ""),
    }


def claimable_pairs(pairs):
    return [f"ecc:{escape(str(c))} = {escape(str(a))}" for c, a in pairs]


def siir_page(addr, id_s):
    d = siir_data(addr, id_s)
    if "error" in d:
        return f"<!doctype html><html><body><p>{escape(d['error'])}</p></body></html>"
    owner = d.get("owner", "")
    owner_link = owner.split(":")[-1]
    hist = "".join(
        f"<tr><td>{escape(h.get('from',''))}</td><td>{escape(h.get('to',''))}</td>"
        f"<td>{escape(str(h.get('timestamp','')))}</td></tr>"
        for h in d.get("history", [])
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR #{d['id']}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
pre{{background:#f6f6f6;padding:8px;border-radius:8px;white-space:pre-wrap;word-break:break-all}}
a{{color:#1d4ed8}}</style></head><body>
<h1>SIIR #{d['id']}</h1>
<p><a href="/company/{addr}/">company</a> · <a href="/company/{addr}/explore">explore</a></p>
<table>
<tr><th>weight</th><td>{escape(str(d.get('weight','')))}</td></tr>
<tr><th>owner</th><td><a href="/company/{addr}/holder/{owner_link}"><code>{escape(str(owner))}</code></a></td></tr>
<tr><th>round</th><td>{escape(str(d.get('round','')))}</td></tr>
<tr><th>label</th><td>{escape(str(d.get('label','')))}</td></tr>
<tr><th>createdAt</th><td>{escape(str(d.get('createdAt','')))}</td></tr>
<tr><th>metadataUri</th><td><code>{escape(str(d.get('metadataUri','')))}</code></td></tr>
<tr><th>fingerprint</th><td><code>{escape(str(d.get('fingerprint','')))}</code></td></tr>
<tr><th>claimable</th><td>{' '.join(claimable_pairs(d['claimable'])) or '—'}</td></tr>
</table>
<h3>History</h3>
<table><tr><th>from</th><th>to</th><th>timestamp</th></tr>{hist or '<tr><td colspan=3>—</td></tr>'}</table>
</body></html>"""
    return body


def holder_page(addr, owner_raw):
    d = holder_data(addr, owner_raw)
    if "error" in d:
        return f"<!doctype html><html><body><p>{escape(d['error'])}</p></body></html>"
    owner = d["owner"]
    rows = "".join(
        f"<tr><td><a href=\"/company/{addr}/siir/{r['id']}\">#{r['id']}</a></td>"
        f"<td>{escape(str(r.get('label','')))}</td>"
        f"<td>{escape(str(r.get('weight','')))}</td>"
        f"<td>{escape(str(r.get('round','')))}</td></tr>"
        for r in d["siirs"]
    )
    claim = ' '.join(claimable_pairs(d["claimable"])) or "—"
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>holder {owner}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
a{{color:#1d4ed8}}</style></head><body>
<h1>Holder</h1>
<p><code>{escape(owner)}</code> · {escape(str(d['company']))}</p>
<p>balance: <b>{escape(str(d['balance']))}</b> SIIRs · claimable: {claim}</p>
<table><tr><th>id</th><th>label</th><th>weight</th><th>round</th></tr>{rows or '<tr><td colspan=4>no SIIRs</td></tr>'}</table>
<p><a href="/company/{addr}/">company</a> · <a href="/company/{addr}/explore">explore</a></p>
</body></html>"""
    return body


def explore_page(addr, qs):
    info = run_getter(addr, "getCompanyInfo") or {}
    reg = register_data(addr, qs)
    divs = run_getter(addr, "getDividendCurrencies") or {}
    plans = (run_getter(addr, "getPlans") or {}).get("plans", [])
    name = info.get("name", addr)
    offset, limit = reg["offset"], reg["limit"]
    prev = f'<a href="/company/{addr}/explore?offset={max(0, offset-limit)}">prev</a>' if offset > 0 else "prev"
    nxt = f'<a href="/company/{addr}/explore?offset={offset+limit}">next</a>' if offset + limit < reg["total"] else "next"
    rows = "".join(
        f"<tr><td><a href=\"/company/{addr}/siir/{r['id']}\">#{r['id']}</a></td>"
        f"<td>{escape(str(r.get('label','')))}</td>"
        f"<td>{escape(str(r.get('weight','')))}</td>"
        f"<td><a href=\"/company/{addr}/holder/{(r.get('owner') or '').split(':')[-1]}\">"
        f"<code>{escape(str(r.get('owner','')))}</code></a></td>"
        f"<td>{escape(str(r.get('round','')))}</td></tr>"
        for r in reg["rows"]
    )
    trows = "".join(
        f"<tr><td>ecc:{escape(str(c))}</td><td>{escape(str(i))}</td><td>{escape(str(d))}</td></tr>"
        for c, i, d in zip(divs.get("ids", []), divs.get("indices", []),
                           divs.get("deposits", []))
    )
    prows = "".join(
        f"<tr><td>{escape(str(p.get('label','')))}</td>"
        f"<td>{escape(str(p.get('count','')))}</td>"
        f"<td>{escape(str(p.get('weight','')))}</td>"
        f"<td>{'yes' if p.get('issued') else 'no'}</td></tr>"
        for p in plans
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>explore {escape(name)}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
pre{{background:#f6f6f6;padding:8px;border-radius:8px;white-space:pre-wrap;word-break:break-all}}
a{{color:#1d4ed8}} h3{{margin-top:32px}}</style></head><body>
<h1>{escape(name)} — explorer</h1>
<p><a href="/company/{addr}/">company page</a> · <a href="/company/{addr}/full">full.json</a> ·
<a href="/company/{addr}/register.json">register.json</a> · <a href="/company/{addr}/holders.json">holders.json</a></p>
<form method="get" action="/company/{addr}/search">
 <input type="text" name="q" placeholder="owner address (hex or 0:hex) or label/metadata substring" size="60">
 <button type="submit">search</button>
</form>
<h3>SIIR register ({reg['total']} issued — showing {offset+1}–{min(offset+limit, reg['total'])}{' (scan truncated)' if reg['truncated'] else ''})</h3>
<table><tr><th>id</th><th>label</th><th>weight</th><th>owner</th><th>round</th></tr>
{rows or '<tr><td colspan=5>none</td></tr>'}</table>
<p>{prev} · {nxt}</p>
<h3>Payout tracks</h3>
<table><tr><th>currency</th><th>index</th><th>deposited</th></tr>{trows or '<tr><td colspan=3>none</td></tr>'}</table>
<h3>Issuance plans</h3>
<table><tr><th>label</th><th>count</th><th>weight</th><th>issued</th></tr>{prows or '<tr><td colspan=4>none</td></tr>'}</table>
</body></html>"""
    return body


def search_page(addr, q, hits, truncated):
    rows = "".join(
        f"<li><a href=\"/company/{addr}/siir/{r['id']}\">#{r['id']}</a> "
        f"{escape(str(r.get('label','')))} · {escape(str(r.get('metadataUri','')))}"
        f" · <code>{escape(str(r.get('owner','')))}</code></li>"
        for r in hits
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>search: {escape(q)}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
a{{color:#1d4ed8}} li{{margin:6px 0}}</style></head><body>
<h1>search: {escape(q)}</h1>
<p>{len(hits)} match{'es' if len(hits)!=1 else ''}{' (scan truncated)' if truncated else ''}</p>
<ul>{rows or '<li>no matches</li>'}</ul>
<p><a href="/company/{addr}/explore">back to explore</a></p></body></html>"""
    return body


def company_page(addr):
    info = run_getter(addr, "getCompanyInfo")
    charter = run_getter(addr, "getCharter")
    logo = run_getter(addr, "getCompanyImage") or {}
    deed = run_getter(addr, "getSIIRImage") or {}
    ui = run_getter(addr, "getUI") or {}

    logo_txt = logo.get("img", "")
    deed_txt = deed.get("img", "")
    ui_txt = ui.get("ui", "")
    charter_txt = (charter or {}).get("charter", "")
    ratified = (charter or {}).get("ratified", False)

    if ui_txt:
        _m, _b = decode_data_uri(ui_txt)
        if _m and _b:
            return _b, _m

    name = (info or {}).get("name", addr)
    money_rows = ""
    divs = run_getter(addr, "getDividendCurrencies") or {}
    div_ids = divs.get("ids") or divs.get("value0") or []
    div_idx = divs.get("indices") or divs.get("value1") or []
    div_dep = divs.get("deposits") or divs.get("value2") or []
    if div_ids:
        bodies = []
        for cid, idx, dep in zip(div_ids, div_idx, div_dep):
            bodies.append(
                f"<p>track ecc:{cid} - deposited {escape(str(dep))} - "
                f"index {escape(str(idx))}</p>"
            )
        money_rows = "".join(bodies)
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(name)}</title>
<style>
 body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
 .card{{border:1px solid #ddd;border-radius:12px;padding:20px;margin:16px 0}}
 img{{border-radius:8px;max-width:120px}}
 pre{{background:#f6f6f6;padding:12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap}}
 .ok{{color:#15803d}} .no{{color:#b91c1c}}
 a{{color:#1d4ed8}}
</style></head><body>
<h1>{escape(name)}</h1>
<p><small>company: <code>{escape(addr)}</code></small></p>
<div class="card"><h3>Company</h3>
 <img src="/company/{addr}/logo" alt="logo" onerror="this.style.display='none'">
 <p><b>{escape((info or {}).get('description',''))}</b></p>
<p>website: {escape((info or {}).get('website','') or '—')} ·
     model: {info.get('issuanceModel',0)} ·
     issued: {info.get('issuedCount',0)} ·
     totalWeight: {info.get('totalWeight',0)} ·
     payoutTracks: {info.get('dividendCount',0)}</p>
  {money_rows}</p>
</div>
<div class="card"><h3>Deed card</h3>
 <img src="/company/{addr}/deed" alt="deed" onerror="this.style.display='none'">
 <p><small>image stored on-chain (~{len(deed_txt)} bytes) — displayed for every SIIR.</small></p>
</div>
<div class="card"><h3>Charter (immutable, founder-bound)</h3>
 <p>Ratified under the founder's key:
   <b class="{ 'ok' if ratified else 'no' }">{'YES' if ratified else 'no'}</b></p>
 <pre>{escape(charter_txt) or '(no charter supplied)'}</pre>
</div>
<p><a href="/company/{addr}/info">info.json</a> ·
   <a href="/company/{addr}/charter">charter.json</a> ·
   <a href="/company/{addr}/explore">explore register</a> ·
   <a href="/">index</a></p>
</body></html>"""
    return body.encode(), "text/html"


class Handler(BaseHTTPRequestHandler):
    server_version = "SIIRGateway/1.0"

    def log_message(self, fmt, *args):
        log(fmt % args)

    def _send(self, body, ctype, code=200, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path).strip("/")
        parts = path.split("/") if path else []
        qs = parse_qs(parsed.query)

        if not parts or parts[0] == "":
            return self.index()
        if parts[0] == "company":
            if len(parts) < 2:
                return self._send(b"missing address", "text/plain", 400)
            addr = parts[1]
            return self.company_resource(addr, parts[2:], qs)
        return self._send(b"not found", "text/plain", 404)

    def index(self):
        rows = []
        for c in load_companies():
            addr = c.get("address", "")
            info = run_getter(addr, "getCompanyInfo") or {}
            rows.append(
                f'<li><a href="/company/{addr}/">{escape(info.get("name", addr))}</a> '
                f'<a href="/company/{addr}/explore">explore</a> '
                f'<small><code>{escape(addr)}</code></small></li>'
            )
        html = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR gateway</title></head>
<body><h1>SIIR gateway — companies on shellnet</h1>
<ul>{''.join(rows) if rows else '<li>none registered in scripts/.work/companies.json</li>'}</ul>
<p><small>everything rendered here is read from the contracts on-chain.</small></p></body></html>"""
        return self._send(html.encode(), "text/html; charset=utf-8")

    def company_resource(self, addr, rest, qs):
        if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
            return self._send(b"bad address (want dapp_id::account_id)", "text/plain", 400)
        data = run_getter(addr, "getCompanyInfo")
        if data is None:
            return self._send(b"contract unreachable (not found / not active)", "text/plain", 503)
        what = rest[0] if rest else ""

        if what in ("", "index.html"):
            body, ctype = company_page(addr)
            return self._send(body, ctype)
        if what == "app":
            uri = (run_getter(addr, "getUI") or {}).get("ui", "")
            mime, raw = decode_data_uri(uri)
            if raw is None:
                return self._send(b"no on-chain UI bundle", "text/plain", 404)
            return self._send(raw, mime or "text/html")
        if what in ("logo", "deed", "getCompanyImage", "getSIIRImage"):
            method = "getCompanyImage" if what == "logo" else "getSIIRImage"
            uri = (run_getter(addr, method) or {}).get("img", "")
            mime, raw = decode_data_uri(uri)
            if raw is None:
                return self._send(b"no image stored", "text/plain", 404)
            return self._send(raw, mime or "application/octet-stream")
        if what == "info":
            self._send(json.dumps(data).encode(), "application/json")
            return
        if what == "charter":
            ch = run_getter(addr, "getCharter")
            fp = run_getter(addr, "getCharterFingerprint")
            self._send(
                json.dumps(
                    {"charter": (ch or {}).get("charter", ""),
                     "ratified": (ch or {}).get("ratified", False),
                     "fingerprint": (fp or {}).get("fp", "")}
                ).encode(),
                "application/json",
            )
            return
        if what == "explore":
            return self._send(explore_page(addr, qs).encode(),
                              "text/html; charset=utf-8")
        if what == "full":
            return self._send(json.dumps(full_data(addr)).encode(),
                              "application/json")
        if what in ("register", "register.json"):
            return self._send(json.dumps(register_data(addr, qs)).encode(),
                              "application/json")
        if what in ("holders", "holders.json"):
            return self._send(json.dumps(holders_data(addr)).encode(),
                              "application/json")
        if what in ("holder", "holder.json") and len(rest) > 1:
            if what == "holder":
                return self._send(holder_page(addr, rest[1]).encode(),
                                  "text/html; charset=utf-8")
            return self._send(json.dumps(holder_data(addr, rest[1])).encode(),
                              "application/json")
        if what == "siir" and len(rest) > 1:
            return self._send(siir_page(addr, rest[1]).encode(),
                              "text/html; charset=utf-8")
        if what == "siir.json" and len(rest) > 1:
            return self._send(json.dumps(siir_data(addr, rest[1])).encode(),
                              "application/json")
        if what == "plans":
            plans = (run_getter(addr, "getPlans") or {}).get("plans", [])
            return self._send(json.dumps(plans).encode(), "application/json")
        if what == "treasury":
            return self._send(
                json.dumps(run_getter(addr, "getDividendCurrencies") or {}).encode(),
                "application/json")
        if what == "history" and len(rest) > 1:
            try:
                sid = int(rest[1])
            except ValueError:
                return self._send(b"bad id", "text/plain", 400)
            h = run_getter(addr, "getHistory", '{"id":%d}' % sid) or {}
            return self._send(json.dumps(h.get("entries", [])).encode(),
                              "application/json")
        if what in ("search", "search.json"):
            q = (qs.get("q") or [""])[0].strip()
            if not q:
                return self._send(b"missing ?q=", "text/plain", 400)
            owner = parse_owner(q)
            if owner:
                if what == "search":
                    return self._send(holder_page(addr, owner).encode(),
                                      "text/html; charset=utf-8")
                return self._send(json.dumps(holder_data(addr, owner)).encode(),
                                  "application/json")
            info = run_getter(addr, "getCompanyInfo") or {}
            total = max(0, as_int(info.get("nextId")) - 1)
            rows, truncated = scan_siirs(addr, 1, total + 1)
            ql = q.lower()
            hits = [r for r in rows
                    if ql in (r.get("label") or "").lower()
                    or ql in (r.get("metadataUri") or "").lower()
                    or ql in (r.get("owner") or "").lower()]
            if what == "search.json":
                return self._send(
                    json.dumps({"query": q, "hits": hits,
                                "scanned": len(rows), "truncated": truncated}).encode(),
                    "application/json")
            return self._send(search_page(addr, q, hits, truncated).encode(),
                              "text/html; charset=utf-8")
        return self._send(b"unknown resource", "text/plain", 404)


def main():
    global NET, DEBUG
    ap = argparse.ArgumentParser(description="SIIR on-chain content gateway")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--net", default="shellnet.ackinacki.org")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    NET = args.net
    DEBUG = args.debug
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    log(f"listening on http://127.0.0.1:{args.port}  (net={NET})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    main()