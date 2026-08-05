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

Everything served here is stored on-chain; nothing is cached by us for
longer than a few seconds.

Usage:  python3 scripts/gateway.py [--port 8000] [--net shellnet.ackinacki.org]
Requires: tvm-cli on PATH and the repo's contracts/ for ABIs.
"""

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

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


def run_getter(address, method):
    key = (address, method)
    now = time.time()
    with CACHE_LOCK:
        hit = CACHE.get(key)
        if hit and now - hit[0] < CACHE_TTL:
            return hit[1]
    out = tvm_cli("run", address, method, "{}", "--abi", COMPANY_ABI)
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
    deposited: {escape((info or {}).get('deposited','0'))} SHELL ·
    deposited: {escape((info or {}).get('depositedUsdc','0'))} USDC ·
    dividendIndex: {escape((info or {}).get('dividendIndex','0'))} ·
    dividendIndexUsdc: {escape((info or {}).get('dividendIndexUsdc','0'))}</p>
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

        if not parts or parts[0] == "":
            return self.index()
        if parts[0] == "company":
            if len(parts) < 2:
                return self._send(b"missing address", "text/plain", 400)
            addr = parts[1]
            what = parts[2] if len(parts) > 2 else ""
            return self.company_resource(addr, what)
        return self._send(b"not found", "text/plain", 404)

    def index(self):
        rows = []
        for c in load_companies():
            addr = c.get("address", "")
            info = run_getter(addr, "getCompanyInfo") or {}
            rows.append(
                f'<li><a href="/company/{addr}/">{escape(info.get("name", addr))}</a> '
                f'<small><code>{escape(addr)}</code></small></li>'
            )
        html = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR gateway</title></head>
<body><h1>SIIR gateway — companies on shellnet</h1>
<ul>{''.join(rows) if rows else '<li>none registered in scripts/.work/companies.json</li>'}</ul>
<p><small>everything rendered here is read from the contracts on-chain.</small></p></body></html>"""
        return self._send(html.encode(), "text/html; charset=utf-8")

    def company_resource(self, addr, what):
        if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
            return self._send(b"bad address (want dapp_id::account_id)", "text/plain", 400)
        data = run_getter(addr, "getCompanyInfo")
        if data is None:
            return self._send(b"contract unreachable (not found / not active)", "text/plain", 503)

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