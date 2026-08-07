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
  GET /company/<addr>/siir/<id>/deed      printable deed card
  GET /company/<addr>/claim               claim form for the gateway's wallet
  POST /company/<addr>/claim              send claim() via the wallet (JSON body {"ids":[...]} or form)
  POST /factory/<addr>/deploy             deployCompany via the founder wallet (JSON body; mirrors deploy.sh §4)
  GET /factory/<addr>/deploy              deploy form page (--writes only; posts JSON to the same URL)
  GET /company/<addr>/plans, /treasury, /history/<id>   JSON
  GET /company/<addr>/search?q=...        address -> holder page; else label/metadata/owner scan
  GET /marketplace/<addr>/stats.json      per-currency order-book summary (best bid/ask, mark, spread, opens)
  GET /company/<addr>/analytics.json      issuance + treasury tracks + marks + charter fingerprint (+ /statement)
  GET /company/<addr>/holder/<owner>/statement.csv   per-holder CSV statement (ranges sampled: first 50 ids)

Everything served here is stored on-chain; nothing is cached by us for
longer than a few seconds. Claim signs with scripts/.work/holder.keys.json
(the gateway's own wallet) and never exposes keys.

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
FACTORY_ABI = os.path.join(CT, "SIIRFactory.abi.json")
MARKETPLACE_ABI = os.path.join(CT, "SIIRMarketplace.abi.json")

# default factory: the self-rooted factory from the last full deploy
# (scripts/.work/factory.addr holds its dapp-id == account-id)
def default_factory():
    try:
        with open(os.path.join(WORK, "factory.addr")) as f:
            h = f.read().strip()
        if re.fullmatch(r"[0-9a-f]{64}", h):
            return f"{h}::{h}"
        if re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", h):
            return h
    except OSError:
        pass
    return None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mirror as mirror_mod

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


# ---------- mirror-mode reads (no tvm-cli) ----------

MIRROR = True
MIRROR_CACHE = {}
MIRROR_LOCK = threading.Lock()
MIRROR_TTL = 5.0  # seconds: one GraphQL state fetch per company per window


def mirror_state(address, abi=COMPANY_ABI):
    with MIRROR_LOCK:
        hit = MIRROR_CACHE.get(address)
        if hit and hit[1].abi_path == abi and time.time() - hit[0] < MIRROR_TTL:
            return hit[1]
    ms = mirror_mod.MirrorState(address, abi, net=NET)
    ms.abi_path = abi
    with MIRROR_LOCK:
        MIRROR_CACHE[address] = (time.time(), ms)
    return ms


def mirror_getter(address, method, params):
    """Answer a getter from the decoded mirror state, shaped like tvm-cli.
    Returns None when the mirror path cannot serve this call."""
    ms = mirror_state(address)
    p = json.loads(params) if params else {}
    if method == "getCompanyInfo":
        return ms.company_info()
    if method == "getDividendCurrencies":
        return ms.dividends()
    if method == "getPlans":
        return {"plans": ms.plans_abi()}
    if method == "getSIIR":
        return ms.siir(int(p["id"]))
    if method == "getOwnerOf":
        return {"value0": ms.owner_of(int(p["id"]))}
    if method == "getClaimable":
        c, a = ms.claimable(int(p["id"]))
        return {"currencies": c, "amounts": a}
    if method == "getClaimableOf":
        c, a = ms.claimable_of(p["owner"])
        return {"currencies": c, "amounts": a}
    if method == "getBalanceOf":
        return {"count": "0x%064x" % ms.balance_of(p["owner"])}
    if method == "getSIIRsOf":
        # v2: ownership as compact ranges [starts[i], ends[i]]
        ranges = ms.ids_of(p["owner"])
        return {
            "starts": ["0x%064x" % s for s, _e in ranges],
            "ends": ["0x%064x" % e for _s, e in ranges],
        }
    if method == "getSegments":
        return {"segments": [
            {"start": "0x%064x" % seg["start"],
             "end": "0x%064x" % seg["end"],
             "owner": seg["owner"]}
            for seg in ms._segments()
        ]}
    if method == "getFingerprint":
        return {"fp": ms.fingerprint(int(p["id"]))}
    if method == "getHistory":
        return {"entries": ms.history(int(p["id"]))}
    if method == "getCompanyImage":
        return {"img": ms.state.get("_logoImage") or ""}
    if method == "getSIIRImage":
        return {"img": ms.state.get("_siirImage") or ""}
    if method == "getUI":
        return {"ui": ms.state.get("_ui") or ""}
    if method == "getCharter":
        return ms.charter()
    if method == "getCharterFingerprint":
        return {"fp": ms.charter_fingerprint()}
    if method == "getContentInfo":
        return {k: str(v) for k, v in ms.content_info().items()}
    if method == "getGovernance":
        s = ms.state
        grace = 0
        if s.get("_dissolved"):
            grace = int(s.get("_dissolvedAt") or 0) + 30 * 86400
        return {
            "governanceEnabled": bool(s.get("_governanceEnabled")),
            "quorumPermille": str(s.get("_quorumPermille", 0)),
            "totalWeight": str(s.get("_totalWeight", 0)),
            "dissolveVotes": str(s.get("_dissolveVotes", 0)),
            "dissolved": bool(s.get("_dissolved")),
            "dissolvedAt": str(s.get("_dissolvedAt", 0)),
            "dissolutionRule": str(s.get("_dissolutionRule", 0)),
            "dissolutionDest": s.get("_dissolutionDest") or "",
            "finalDeposited": bool(s.get("_finalDeposited")),
            "finalized": bool(s.get("_finalized")),
            "graceEnd": str(grace),
        }
    if method == "getVoteInfo":
        owner = p["owner"]
        voted = (ms.state.get("_votedDissolve") or {}).get(owner, False)
        return {"voted": bool(voted), "weight": str(ms.weight_of(owner))}
    if method == "getVersion":
        return {"value0": "2.1.0", "value1": "CompanySIIR"}
    if method == "getCompanyCount":
        ms = mirror_state(address, FACTORY_ABI)
        return {"count": str(ms.state.get("_companyCount", 0))}
    if method == "getMarketplaceAddress":
        ms = mirror_state(address, FACTORY_ABI)
        dapp = address.split("::")[0]
        mkt = ms.state.get("_marketplace") or ""
        return {"value0": f"{dapp}::{mkt.split(':')[-1]}" if mkt else ""}
    if method == "getCompanyList":
        ms = mirror_state(address, FACTORY_ABI)
        dapp = address.split("::")[0]
        companies = ms.state.get("_companies") or {}
        idx = sorted(companies, key=lambda k: int(k))
        return {
            "company": [f"{dapp}::{companies[i][0].split(':')[-1]}" for i in idx],
            "name": [companies[i][1] for i in idx],
            "issuanceModel": [companies[i][2] for i in idx],
            "founder": [companies[i][3] for i in idx],
        }
    if method in ("getListingCount", "getBidCount"):
        ms = mirror_state(address, MARKETPLACE_ABI)
        return {"count": str(ms.state.get("_listingCount" if method == "getListingCount" else "_bidCount", 0))}
    if method in ("getListings", "getBids"):
        ms = mirror_state(address, MARKETPLACE_ABI)
        dapp = ms.state.get("_factory", "").split(":")[-1] or ""
        src = ms.state.get("_listings" if method == "getListings" else "_bids", {})
        ids = sorted(src, key=lambda k: int(k))
        rows = [src[i] for i in ids]
        if method == "getListings":
            return {
                "ids": ids,
                "company": [f"{dapp}::{r[0].split(':')[-1]}" for r in rows],
                "siirIds": [str(r[1]) for r in rows],
                "seller": [r[2] for r in rows],
                "askPrice": [str(r[3]) for r in rows],
                "currencyId": [str(r[4]) for r in rows],
                "listedAt": [str(r[5]) for r in rows],
                "active": [bool(r[6]) for r in rows],
            }
        return {
            "ids": ids,
            "bidder": [r[0] for r in rows],
            "company": [f"{dapp}::{r[1].split(':')[-1]}" for r in rows],
            "siirIds": [str(r[2]) for r in rows],
            "price": [str(r[3]) for r in rows],
            "currencyId": [str(r[4]) for r in rows],
            "validUntil": [str(r[5]) for r in rows],
            "accepted": [bool(r[6]) for r in rows],
        }
    return None


def run_getter(address, method, params="{}", abi=COMPANY_ABI):
    key = (address, method, params)
    now = time.time()
    with CACHE_LOCK:
        hit = CACHE.get(key)
        if hit and now - hit[0] < CACHE_TTL:
            return hit[1]
    data = None
    if MIRROR:
        try:
            data = mirror_getter(address, method, params)
        except Exception as e:
            log(f"mirror {method}@{address} failed ({e}); falling back to tvm-cli")
            data = None
    if data is None:
        if method == "getGovernance":
            # tvm-cli 3.0.0 cannot decode this getter's result tuple; the
            # mirror is the only reliable source for governance state.
            log(f"getGovernance@{address}: mirror failed, no tvm-cli fallback")
            return None
        out = tvm_cli("run", address, method, params, "--abi", abi)
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


def load_companies_from(factory):
    """Decode the factory's on-chain company registry (mirror state)."""
    if not factory:
        return []
    try:
        ms = mirror_state(factory, FACTORY_ABI)
        dapp = factory.split("::")[0]
        companies = ms.state.get("_companies") or {}
        rows = []
        for i in sorted(companies, key=lambda k: int(k)):
            e = companies[i]
            rows.append({
                "address": f"{dapp}::{e[0].split(':')[-1]}",
                "name": e[1],
                "issuanceModel": e[2],
                "founder": e[3],
                "index": int(i),
                "source": "factory-registry",
            })
        return rows
    except Exception as e:
        log(f"factory registry decode failed ({e})")
        return []


def load_companies():
    """Company directory straight off the factory's on-chain registry
    (map index -> CompanyEntry), decoded from the mirror node. Falls back to
    scripts/.work/companies.json when the factory is unreachable."""
    rows = load_companies_from(default_factory())
    if rows:
        return rows
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
    """data:<mime>;base64,<data> -> (mime, bytes) or (None, None).
    A `;base64,gz,` marker means the payload is gzip-compressed (the on-chain
    UI bundle is stored compressed when it exceeds the message-size budget)."""
    if not uri:
        return None, None
    m = re.match(r"data:([^;]+);base64,(?:(gz),)?(.*)$", uri, re.S)
    if not m:
        return None, None
    try:
        raw = base64.b64decode(m.group(3))
        if m.group(2) == "gz":
            import gzip
            raw = gzip.decompress(raw)
        return m.group(1), raw
    except Exception:
        return None, None


def escape(s):
    s = "" if s is None else str(s)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------- The Seal: official SIIR deed silhouette (mirrors app.js) ----------
SEAL_TIERS = [
    ("bronze", "#cd7f32", "#7c4a1e"),
    ("silver", "#c0c0c0", "#5f6b76"),
    ("gold", "#ffd700", "#8a6d00"),
    ("platinum", "#e5e4e2", "#6b7280"),
    ("genesis", "#34d399", "#065f46"),
    ("diamond", "#22d3ee", "#155e75"),
]
SEAL_TIER_FALLBACK = ("#9aa5b1", "#4b5563")


def seal_tier(label):
    l = (label or "").lower()
    for name, c1, c2 in SEAL_TIERS:
        if name in l:
            return (c1, c2)
    return SEAL_TIER_FALLBACK


def seal_inner(plan, label):
    img = (plan or {}).get("image") or ""
    if img:
        b64 = img.split(",", 1)[1] if "," in img else img
        return (
            '<image href="data:image/svg+xml;base64,%s" x="42" y="42" width="116" '
            'height="116" preserveAspectRatio="xMidYMid meet"/>' % b64
        )
    c1, c2 = seal_tier(label)
    mark = (label or "SIIR").upper()[:9]
    return (
        '<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/>'
        "</linearGradient></defs>"
        '<rect x="42" y="42" width="116" height="116" rx="10" fill="url(#tg)"/>'
        '<circle cx="100" cy="100" r="38" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/>'
        '<path d="M100 78l8 16 18 3-13 12 3 18-16-8-16 8 3-18-13-12 18-3z" fill="#fff"/>'
        '<text x="100" y="148" font-size="11" fill="#fff" text-anchor="middle" '
        'font-family="monospace">%s</text>' % (c1, c2, escape(mark))
    )


def seal_svg(label, round_i, sid, plans, width=230):
    plans = plans or []
    plan = plans[round_i] if 0 <= round_i < len(plans) else {}
    serial = "#%d" % int(sid)
    return (
        '<svg class="seal" viewBox="0 0 200 264" width="%d" '
        'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SIIR deed seal">'
        '<defs><radialGradient id="sbg" cx=".5" cy=".35" r=".8">'
        '<stop offset="0" stop-color="#2a3344"/><stop offset="1" stop-color="#101623"/>'
        "</radialGradient></defs>"
        '<rect x="0" y="0" width="200" height="264" rx="18" fill="url(#sbg)"/>'
        '<circle cx="100" cy="108" r="86" fill="none" stroke="#7d8aa0" stroke-width="10" stroke-dasharray="3.2 4.6"/>'
        '<circle cx="100" cy="108" r="81" fill="none" stroke="#3d4a5e" stroke-width="1.5"/>'
        '<circle cx="100" cy="108" r="73" fill="#0b1220"/>'
        '<circle cx="100" cy="108" r="66" fill="none" stroke="#55647c" stroke-width="1"/>'
        '<clipPath id="sw"><circle cx="100" cy="108" r="62"/></clipPath>'
        '<g clip-path="url(#sw)">%s</g>'
        '<circle cx="100" cy="108" r="62" fill="none" stroke="#7d8aa0" stroke-width="2.5"/>'
        '<circle cx="100" cy="108" r="69" fill="none" stroke="#cdd6e4" stroke-width="1.5" stroke-dasharray="1 6"/>'
        '<rect x="28" y="200" width="144" height="44" rx="10" fill="#161d2b" stroke="#3d4a5e"/>'
        '<text x="100" y="218" font-size="12.5" fill="#e5e7eb" text-anchor="middle" '
        'font-family="sans-serif">%s</text>'
        '<text x="100" y="236" font-size="9.5" fill="#8b96a8" text-anchor="middle" '
        'font-family="monospace">SIIR %s</text></svg>' % (
            width, seal_inner(plan, label), escape(label or ""), serial
        )
    )



def as_int(v, default=0):
    if v is None:
        return default
    try:
        return int(v) if isinstance(v, int) else int(v, 0)
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


def _mirror_register_rows(ms):
    """Rows for the whole register from the lazy mirror state: one range row
    per ownership segment plus one row per per-id override."""
    rows = []
    for seg in ms._segments():
        s = ms.siir(seg["start"])
        if not s:
            continue
        rows.append({
            "id": str(seg["start"]),
            "idEnd": str(seg["end"]),
            "weight": s["weight"],
            "owner": s["owner"],
            "createdAt": s["createdAt"],
            "round": s["round"],
            "label": s["label"],
            "metadataUri": s["metadataUri"],
            "size": str(seg["end"] - seg["start"] + 1),
            "range": True,
        })
    for oid, ov in ms._overrides().items():
        s = ms.siir(oid)
        if not s:
            continue
        rows.append({
            "id": str(oid),
            "idEnd": str(oid),
            "weight": s["weight"],
            "owner": s["owner"],
            "createdAt": s["createdAt"],
            "round": s["round"],
            "label": ov[0] or "",
            "metadataUri": ov[1] or "",
            "size": "1",
            "range": False,
        })
    rows.sort(key=lambda r: int(r["id"]))
    return rows


def lazy_mirror(addr):
    """MirrorState serving the v2 lazy layout, or raise when the decoded
    state does not look like one (old materialized layout / decode failure),
    so callers can fall back to the legacy per-id path."""
    ms = mirror_state(addr)
    starts = ms.state.get("_planStartId")
    ends = [v for v in (ms.state.get("_planEndId") or {}).values()]
    issued = ms.state.get("_issuedCount")
    if starts is None or issued is None:
        raise ValueError("lazy state unavailable")
    if (max(ends) if ends else 0) != issued:
        raise ValueError("lazy state mismatch")
    return ms


def register_data(addr, qs):
    info = run_getter(addr, "getCompanyInfo") or {}
    total = max(0, as_int(info.get("nextId")) - 1)
    offset = max(0, int((qs.get("offset") or ["0"])[0] or 0))
    limit = min(100, max(1, int((qs.get("limit") or ["25"])[0] or 25)))
    try:
        ms = lazy_mirror(addr)
        rows = _mirror_register_rows(ms)
        page = rows[offset:offset + limit]
        return {"total": total, "offset": offset, "limit": limit,
                "truncated": len(page) == limit and offset + limit < len(rows),
                "rows": page, "lazy": True}
    except Exception:
        pass
    # legacy fallback: per-id scan (materialized registers only)
    end = min(total + 1, offset + limit + 1)
    rows, truncated = scan_siirs(addr, offset + 1, end)
    return {"total": total, "offset": offset, "limit": limit,
            "truncated": truncated, "rows": rows, "lazy": False}


def holders_data(addr):
    info = run_getter(addr, "getCompanyInfo") or {}
    total = max(0, as_int(info.get("nextId")) - 1)
    try:
        ms = lazy_mirror(addr)
        holders = {}
        for seg in ms._segments():
            pid = ms._plan_of(seg["start"])
            if pid is None:
                continue
            p = ms._plans_raw()[pid]
            w = as_int(p[1])
            n = as_int(seg["end"]) - as_int(seg["start"]) + 1
            h = holders.setdefault(seg["owner"], {"count": 0, "weight": 0})
            h["count"] += n
            h["weight"] += w * n
        return {"total": total, "truncated": False, "holders": holders,
                "lazy": True}
    except Exception:
        pass
    # legacy fallback: per-id scan (materialized registers only)
    rows, truncated = scan_siirs(addr, 1, total + 1)
    holders = {}
    for r in rows:
        h = holders.setdefault(r["owner"], {"count": 0, "weight": 0})
        h["count"] += 1
        h["weight"] += as_int(r.get("weight"))
    return {"total": total, "truncated": truncated, "holders": holders,
            "lazy": False}


def holder_data(addr, owner_raw):
    owner = parse_owner(owner_raw)
    if owner is None:
        return {"error": "bad owner (want 64-hex, 0:64-hex, or dapp::acct)"}
    info = run_getter(addr, "getCompanyInfo") or {}
    out = run_getter(addr, "getSIIRsOf", '{"owner":"%s"}' % owner) or {}
    starts = out.get("starts", out.get("value0", []))
    ends = out.get("ends", out.get("value1", []))
    ranges = list(zip([int(s, 16) for s in starts],
                      [int(e, 16) for e in ends]))
    claim = run_getter(addr, "getClaimableOf", '{"owner":"%s"}' % owner) or {}
    balance = as_int((run_getter(addr, "getBalanceOf",
                                 '{"owner":"%s"}' % owner)
                      or {}).get("count"))
    rows = []
    if balance <= 200:
        ids = []
        for s, e in ranges:
            ids.extend(range(s, e + 1))
        for i in ids:
            r = run_getter(addr, "getSIIR", '{"id":%d}' % i) or {}
            rows.append({"id": i, "idEnd": i, "weight": r.get("weight"),
                         "round": r.get("round")})
    else:
        for s, e in ranges:
            r = run_getter(addr, "getSIIR", '{"id":%d}' % s) or {}
            rows.append({"id": s, "idEnd": e,
                         "size": e - s + 1,
                         "weight": r.get("weight"), "round": r.get("round")})
    return {
        "owner": owner,
        "company": info.get("name", ""),
        "balance": str(balance),
        "siirs": rows,
        "claimable": non_shell_pairs(zip(claim.get("currencies", []),
                                         claim.get("amounts", []))),
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
    out["claimable"] = non_shell_pairs(zip(cl.get("currencies", []),
                                           cl.get("amounts", [])))
    out["history"] = h.get("entries", [])
    return out


def full_data(addr):
    divs = run_getter(addr, "getDividendCurrencies") or {}
    ci = run_getter(addr, "getContentInfo") or {}
    ver = run_getter(addr, "getVersion") or {}
    return {
        "company": run_getter(addr, "getCompanyInfo") or {},
        "treasury": non_shell_tracks(divs),
        "plans": (run_getter(addr, "getPlans") or {}).get("plans", []),
        "content": ci,
        "version": ver.get("value0", ""),
    }


def claimable_pairs(pairs):
    return [f"ecc:{escape(str(c))} = {escape(str(a))}" for c, a in pairs]


# v2.5: SHELL (ecc 2) is network fuel by design — it can never be a
# dividend. Filter it out of every treasury/claim view (old companies may
# still carry a SHELL track from before the rule; the UI must not present
# it as a dividend).
def non_shell_pairs(pairs):
    return [(c, a) for c, a in pairs if as_int(c) != 2]


def non_shell_tracks(divs):
    return [
        (c, i, d) for c, i, d in zip(divs.get("ids", []), divs.get("indices", []),
                                    divs.get("deposits", []))
        if as_int(c) != 2
    ]


# ---------- market analytics (live order book; no on-chain history) ----------

def market_stats(mkt):
    """Per-currency book summary from the marketplace's CURRENT state:
    best bid/ask, mark (mid when both sides exist, else the live side),
    spread, open counts and value. There is no on-chain trade history, so
    volume/last-trade are deliberately absent — the book is the market."""
    listings = run_getter(mkt, "getListings", abi=MARKETPLACE_ABI) or {}
    bids = run_getter(mkt, "getBids", abi=MARKETPLACE_ABI) or {}
    book = {}
    for price, cid, act in zip(listings.get("askPrice", []),
                               listings.get("currencyId", []),
                               listings.get("active", [])):
        if not act:
            continue
        s = book.setdefault(str(cid), {"currency": str(cid), "bestAsk": None,
                                       "bestBid": None, "openAsks": 0,
                                       "openBids": 0, "askValue": 0,
                                       "bidValue": 0, "mark": None})
        p = as_int(price)
        if s["bestAsk"] is None or p < s["bestAsk"]:
            s["bestAsk"] = p
        s["openAsks"] += 1
        s["askValue"] += p
    for price, cid, acc in zip(bids.get("price", []),
                               bids.get("currencyId", []),
                               bids.get("accepted", [])):
        if acc:
            continue
        s = book.setdefault(str(cid), {"currency": str(cid), "bestAsk": None,
                                       "bestBid": None, "openAsks": 0,
                                       "openBids": 0, "askValue": 0,
                                       "bidValue": 0, "mark": None})
        p = as_int(price)
        if s["bestBid"] is None or p > s["bestBid"]:
            s["bestBid"] = p
        s["openBids"] += 1
        s["bidValue"] += p
    for s in book.values():
        bb, ba = s["bestBid"], s["bestAsk"]
        if bb is not None and ba is not None:
            s["mark"] = (bb + ba) // 2
            s["spread"] = ba - bb
        elif bb is not None:
            s["mark"] = bb
        elif ba is not None:
            s["mark"] = ba
        for k in ("bestAsk", "bestBid", "mark", "askValue", "bidValue", "spread"):
            if s[k] is not None:
                s[k] = str(s[k])
    return book


def company_analytics(addr):
    """Compliance/valuation report for one company: issuance, treasury
    (SHELL excluded), dividends paid per 1000-weight to date, and the
    current mark from the factory's marketplace book."""
    info = run_getter(addr, "getCompanyInfo") or {}
    divs = run_getter(addr, "getDividendCurrencies") or {}
    plans = (run_getter(addr, "getPlans") or {}).get("plans", [])
    charter = run_getter(addr, "getCharter") or {}
    ver = run_getter(addr, "getVersion") or {}
    total_weight = as_int(info.get("totalWeight"), 1) or 1
    tracks = []
    for cid, idx, dep in non_shell_tracks(divs):
        idx_i = as_int(idx)
        div1000 = 1000 * idx_i // 1000000000
        tracks.append({"currency": str(cid), "deposited": str(dep),
                       "index": str(idx),
                       "dividendsPer1000Weight": str(div1000)})
    factory = (info.get("factory") or "").strip()
    mkt = ""
    marks = {}
    if factory:
        # the decoded address is legacy "0:<hex>"; the factory is
        # self-rooted, so the full form is <hex>::<hex>
        if factory.startswith("0:"):
            factory = factory[2:]
        if "::" not in factory:
            factory = f"{factory}::{factory}"
        mkt = (run_getter(factory, "getMarketplaceAddress",
                          abi=FACTORY_ABI) or {}).get("value0", "")
        book = market_stats(mkt)
        for cid, s in book.items():
            if s.get("mark") is not None:
                marks[cid] = s
    return {
        "company": addr,
        "name": info.get("name", ""),
        "issued": str(info.get("issuedCount", "")),
        "totalWeight": str(info.get("totalWeight", "")),
        "dividendTracks": tracks,
        "marks": marks,
        "marketplace": mkt,
        "plans": plans,
        "charterRatified": charter.get("ratified", False),
        "charterFingerprint": (run_getter(addr, "getCharterFingerprint")
                               or {}).get("fp", ""),
        "version": ver.get("value0", ""),
        "generatedAt": int(time.time()),
    }


def holder_statement_csv(addr, owner_raw):
    """Per-holder statement: every owned id (or range head) with weight,
    per-currency claimable, and per-id history rows — CSV for spreadsheets.
    Ranges are sampled (first ids only) so 10B-id registers stay bounded."""
    owner = owner_raw.split(":")[-1]
    d = holder_data(addr, owner)
    out = ["id,weight,round,currency,claimable"]
    for row in d.get("siirs", []):
        start = row["id"]
        end = row.get("idEnd", start)
        for i in range(start, min(end, start + 49) + 1):
            for cur, amt in d.get("claimable", []):
                if str(cur) == "2":
                    continue
                out.append(f"{i},{row.get('weight','')},{row.get('round','')},"
                           f"{cur},{amt}")
        if end > start + 49:
            out.append(f"{start}–{end},(range, first 50 listed),,,")
    out.append("")
    out.append("history: id,timestamp,from,to")
    for row in d.get("siirs", []):
        start = row["id"]
        end = row.get("idEnd", start)
        for i in range(start, min(end, start + 49) + 1):
            h = (run_getter(addr, "getHistory", '{"id":%d}' % i) or {})
            for e in h.get("entries", [])[:10]:
                out.append(f"{i},{e.get('timestamp','')},{e.get('from','')},"
                           f"{e.get('to','')}")
    out.append("")
    out.append(f"owner,{owner}")
    out.append(f"company,{d.get('company','')}")
    out.append(f"balance,{d.get('balance','')}")
    return "\n".join(out) + "\n"


# ---------- wallet (claim) ----------

MULTISIG_ABI_PATHS = [
    os.path.join(ROOT, "contracts", "0.79.3_compiled",
                 "updatecustodianmultisigwallet",
                 "UpdateCustodianMultisigWallet.abi.json"),
    os.path.join("/tmp/opencode/acki-research/ackinacki", "contracts",
                 "0.79.3_compiled", "updatecustodianmultisigwallet",
                 "UpdateCustodianMultisigWallet.abi.json"),
]
WALLET_KEYS = os.path.join(WORK, "holder.keys.json")
WALLET_ADDR = os.path.join(WORK, "holder.addr")
WALLET_ABI = None


def wallet_abi():
    return WALLET_ABI


def gateway_wallet():
    """(legacy 0:hex, keys path) for the gateway's own wallet, or None."""
    if not (os.path.exists(WALLET_KEYS) and os.path.exists(WALLET_ADDR)):
        return None
    try:
        addr = open(WALLET_ADDR).read().strip()
    except OSError:
        return None
    if not addr:
        return None
    if not addr.startswith("0:"):
        addr = "0:" + addr
    return addr, WALLET_KEYS


def wallet_ext(legacy):
    """extended <dapp>::<acct> for a self-rooted legacy address."""
    h = legacy.split(":")[-1]
    return f"{h}::{h}"


def wallet_owns(addr, wallet, ids):
    owned = []
    for i in ids:
        s = run_getter(addr, "getSIIR", '{"id":%d}' % i) or {}
        if s.get("owner") == wallet:
            owned.append(i)
    return owned


def pending_for(addr, ids):
    total = 0
    for i in ids:
        cl = run_getter(addr, "getClaimable", '{"id":%d}' % i) or {}
        pairs = non_shell_pairs(zip(cl.get("currencies", []),
                                    cl.get("amounts", [])))
        total += sum(as_int(a) for _, a in pairs)
    return total
ALLOW_WRITES = False
WRITE_RATE = (10, 60)  # max requests per window (per IP) on write endpoints
_write_hits = {}
_write_lock = threading.Lock()


def _rate_limited(ip):
    """True when ip has exceeded the write-endpoint budget."""
    with _write_lock:
        now = time.time()
        limit, window = WRITE_RATE
        bucket = _write_hits.get(ip, [])
        bucket = [t for t in bucket if now - t < window]
        bucket.append(now)
        _write_hits[ip] = bucket
        return len(bucket) > limit


def _writes_blocked(addr):
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>read-only gateway</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#111}}
a{{color:#1d4ed8}}</style></head><body>
<h1>This gateway is read-only</h1>
<p>Per the SIIR gas model, transactions are <strong>signed by the user's own wallet</strong>
and submitted directly to the chain (gas is paid by the sender's wallet — no server-side keys).
The gateway never holds keys in production.</p>
<p>To claim dividends from your own wallet, sign the <code>claim</code> call with your keys and
submit it to the chain endpoint, or run a local gateway with <code>--writes</code>
for development (uses <code>scripts/.work/holder.keys.json</code> — dev networks only).</p>
<p><a href="/company/{addr}/">company</a></p></body></html>"""


F_DEPLOY = 26000000000  # SHELL attached by the founder wallet for a company deploy
DEPLOY_NATIVE = 3000000000


def _keys_pubkey(keys_path):
    try:
        return json.load(open(keys_path)).get("public", "")
    except (OSError, json.JSONDecodeError):
        return ""


def do_deploy(factory, req):
    """Founder-wallet company deploy (mirrors deploy.sh §4): the founder wallet
    calls factory.deployCompany as an internal message attaching SHELL; the
    factory converts exactly the child reserve + gas + forward fees and refunds
    the excess. Returns the predicted company address, txid, and settle status."""
    w = gateway_wallet()
    abi = wallet_abi()
    if w is None:
        return {"error": "gateway wallet not configured (scripts/.work/holder.keys.json)"}
    if abi is None:
        return {"error": "multisig ABI not found (see --multisig-abi)"}
    wallet, keys = w
    founder = req.get("founder") or wallet
    if not str(founder).startswith("0:"):
        founder = "0:" + str(founder)
    founder_pub = req.get("founderPubkey") or ("0x" + _keys_pubkey(keys))
    if founder_pub and not founder_pub.startswith("0x"):
        founder_pub = "0x" + founder_pub
    plans = req.get("plans") or []
    if not isinstance(plans, list) or not plans:
        return {"error": "plans: need at least one tier {count, weight, label, image}"}
    for p in plans:
        if as_int(p.get("count"), 0) <= 0:
            return {"error": f"plan {p.get('label')}: count must be > 0"}
        img = str(p.get("image") or "")
        if len(img.encode()) > 1 << 12:
            return {"error": f"plan {p.get('label')}: image exceeds 4 KiB (MAX_PLAN_IMAGE_SIZE)"}
    for field, limit in (("logoImage", 1 << 20), ("siirImage", 1 << 20),
                         ("ui", 4 << 20), ("charter", 1 << 20)):
        if len(str(req.get(field) or "").encode()) > limit:
            return {"error": f"{field} exceeds {limit} bytes"}
    params = {
        "name": str(req.get("name", "")),
        "description": str(req.get("description", "")),
        "website": str(req.get("website", "")),
        "metadataUri": str(req.get("metadataUri", "")),
        "founder": founder,
        "founderPubkey": founder_pub,
        "issuanceModel": as_int(req.get("issuanceModel"), 0),
        "plans": [{
            "count": str(as_int(p.get("count"), 0)),
            "weight": str(as_int(p.get("weight"), 0)),
            "label": str(p.get("label", "")),
            "issued": bool(p.get("issued")),
            "image": str(p.get("image") or ""),
        } for p in plans],
        "logoImage": str(req.get("logoImage") or ""),
        "siirImage": str(req.get("siirImage") or ""),
        "ui": str(req.get("ui") or ""),
        "charter": str(req.get("charter") or ""),
        "initialValue": str(as_int(req.get("initialValue"), 20000000000)),
        "governanceEnabled": bool(req.get("governanceEnabled")),
        "quorumPermille": as_int(req.get("quorumPermille"), 500),
        "dissolutionRule": as_int(req.get("dissolutionRule"), 0),
        "dissolutionDest": str(req.get("dissolutionDest") or founder),
    }
    company = (run_getter(factory, "getCompanyAddress",
                          json.dumps({"founder": founder,
                                      "founderPubkey": founder_pub}),
                          abi=FACTORY_ABI) or {}).get("value0", "")
    if not company:
        return {"error": "factory.getCompanyAddress failed (bad factory address?)"}
    body = tvm_cli("body", "--abi", FACTORY_ABI, "deployCompany", json.dumps(params))
    try:
        payload = json.loads(body.stdout)["Message"]
    except (json.JSONDecodeError, KeyError):
        return {"error": f"failed to build deployCompany body: {body.stdout[:200]}"}
    tx = {
        # deployCompany must reach the factory (onlyOwnerOrFounder path): the
        # factory converts the attached SHELL to fuel and deploys the child
        "dest": "0:" + factory.split("::")[-1],
        "value": str(DEPLOY_NATIVE),
        "cc": {"2": str(F_DEPLOY)},
        "bounce": True,
        "flags": 1,
        "payload": payload,
    }
    out = tvm_cli("callx", "--abi", abi, "--addr", wallet_ext(wallet),
                  "--keys", keys, "-m", "sendTransaction", json.dumps(tx))
    if out.returncode != 0:
        return {"error": f"sendTransaction failed: {out.stderr[:300]}"}
    try:
        txid = (json.loads(out.stdout) or {}).get("tx_hash", "")
    except json.JSONDecodeError:
        txid = ""
    dapp = factory.split("::")[0]
    company_addr = f"{dapp}::{company.split(':')[-1]}"
    active = False
    for _ in range(15):
        time.sleep(2)
        info = run_getter(company_addr, "getCompanyInfo") or {}
        if info.get("name"):
            active = True
            break
    return {"company": company_addr, "txid": txid, "active": active,
            "name": params["name"], "founder": founder}


def do_claim(addr, ids):
    """Sign and send claim(ids) from the gateway's wallet; poll until settled."""
    w = gateway_wallet()
    abi = wallet_abi()
    if w is None:
        return {"error": "gateway wallet not configured (scripts/.work/holder.keys.json)"}
    if abi is None:
        return {"error": "multisig ABI not found (see --multisig-abi)"}
    wallet, keys = w
    ids = sorted({int(i) for i in ids if str(i).lstrip("-").isdigit() and int(i) > 0})
    if not ids:
        return {"error": "no ids given"}
    owned = wallet_owns(addr, wallet, ids)
    not_owned = [i for i in ids if i not in owned]
    if not_owned:
        return {"error": f"not owned by gateway wallet: {not_owned}"}
    pending = pending_for(addr, ids)
    if pending <= 0:
        return {"error": "nothing claimable yet (deposit dividends first)",
                "ids": ids}
    company_legacy = "0:" + addr.split("::")[1]
    body = tvm_cli("body", "--abi", COMPANY_ABI, "claim",
                   json.dumps({"ids": [str(i) for i in ids]}))
    try:
        payload = json.loads(body.stdout)["Message"]
    except (json.JSONDecodeError, KeyError):
        return {"error": f"failed to build claim body: {body.stdout[:200]}"}
    params = json.dumps({
        "dest": company_legacy, "value": "1000000000", "cc": {},
        "bounce": True, "flags": 1, "payload": payload,
    })
    out = tvm_cli("callx", "--abi", abi, "--addr", wallet_ext(wallet),
                  "--keys", keys, "-m", "sendTransaction", params)
    if out.returncode != 0:
        return {"error": f"sendTransaction failed: {out.stderr[:300]}"}
    try:
        txid = (json.loads(out.stdout).get("Transaction") or {}).get("id", "")
    except json.JSONDecodeError:
        txid = ""
    remaining = pending
    settled_at = None
    for _ in range(15):
        time.sleep(2)
        remaining = pending_for(addr, ids)
        if remaining == 0:
            settled_at = time.time()
            break
    return {"ids": ids, "pending": pending, "txid": txid,
            "settled": remaining == 0, "remaining": remaining,
            "settledAt": settled_at}


def claim_form_page(addr):
    w = gateway_wallet()
    if w is None:
        return f"""<!doctype html><html><body><p>Gateway wallet not configured —
        scripts/.work/holder.keys.json missing. Run scripts/deploy.sh first.</p>
        <p><a href="/company/{addr}/">company</a></p></body></html>"""
    wallet, _ = w
    out = run_getter(addr, "getSIIRsOf", '{"owner":"%s"}' % wallet) or {}
    ids = sorted(int(i, 16) for i in out.get("ids", []))
    rows = ""
    for i in ids:
        cl = run_getter(addr, "getClaimable", '{"id":%d}' % i) or {}
        pairs = non_shell_pairs(zip(cl.get("currencies", []),
                                    cl.get("amounts", [])))
        total = sum(as_int(a) for _, a in pairs)
        if total > 0:
            rows += (f'<tr><td><input type="checkbox" name="ids" value="{i}" checked></td>'
                     f'<td><a href="/company/{addr}/siir/{i}">#{i}</a></td>'
                     f'<td>{escape(str(total))}</td>'
                     f'<td>{" ".join(claimable_pairs(pairs)) or "—"}</td></tr>')
    if not rows:
        rows = '<tr><td colspan=4>nothing claimable</td></tr>'
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>claim — SIIR</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
a{{color:#1d4ed8}}</style></head><body>
<h1>Claim dividends</h1>
<p>wallet: <code>{escape(wallet)}</code> · signing with the gateway's key (never leaves the server)</p>
<form method="post" action="/company/{addr}/claim">
<table><tr><th></th><th>id</th><th>pending</th><th>claimable</th></tr>
{rows}
</table>
<p><button type="submit">claim selected</button></p>
</form>
<p><a href="/company/{addr}/explore">explore</a> · <a href="/company/{addr}/">company</a></p>
</body></html>"""


def claim_result_page(addr, r):
    if "error" in r:
        msg = f"<p class='err'>{escape(r['error'])}</p>"
    else:
        msg = (f"<p class='ok'>claim sent and settled ✓</p>" if r.get("settled")
               else f"<p class='warn'>claim sent but still pending "
                    f"({r.get('remaining')} left)</p>")
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>claim result</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
.ok{{color:#15803d}} .err{{color:#b91c1c}} .warn{{color:#b45309}}
a{{color:#1d4ed8}}</style></head><body>
<h1>Claim result</h1>
{msg}
<table>
<tr><th>ids</th><td>{escape(str(r.get('ids','')))}</td></tr>
<tr><th>pending</th><td>{escape(str(r.get('pending','')))}</td></tr>
<tr><th>txid</th><td><code>{escape(str(r.get('txid','')))}</code></td></tr>
<tr><th>remaining</th><td>{escape(str(r.get('remaining','')))}</td></tr>
</table>
<p><a href="/company/{addr}/holder/{str(r.get('ids','')).split(',')[0].strip('[]') if r.get('ids') else ''}">holder</a> ·
<a href="/company/{addr}/claim">claim again</a> · <a href="/company/{addr}/">company</a></p>
</body></html>"""


def deed_page(addr, id_s):
    d = siir_data(addr, id_s)
    if "error" in d:
        return f"<!doctype html><html><body><p>{escape(d['error'])}</p></body></html>"
    info = run_getter(addr, "getCompanyInfo") or {}
    name = info.get("name", addr)
    owner = d.get("owner", "")
    owner_link = owner.split(":")[-1]
    hist = "".join(
        f"<tr><td>{escape(h.get('from',''))}</td><td>{escape(h.get('to',''))}</td>"
        f"<td>{escape(str(h.get('timestamp','')))}</td></tr>"
        for h in d.get("history", [])
    )
    claim = " ".join(claimable_pairs(d["claimable"])) or "—"
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>deed #{d['id']} — {escape(name)}</title>
<style>
 body{{font-family:ui-serif,Georgia,serif;max-width:560px;margin:32px auto;padding:0 16px;color:#111;background:#fafaf9}}
 .deed{{border:2px solid #111;border-radius:16px;padding:28px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.12)}}
 .head{{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:14px}}
 .head img{{height:56px;width:56px;border-radius:10px;object-fit:cover}}
 .no{{font-family:ui-sans-serif,sans-serif;font-size:13px;color:#6b7280}}
 .row{{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px dotted #ddd;font-size:14px}}
 .row b{{font-weight:600}}
 .row code{{font-size:12px;word-break:break-all}}
 table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:12px}}
 .print{{margin-top:16px}}
</style></head><body>
<div class="deed">
 <div class="head">
  <img src="/company/{addr}/logo" alt="logo" onerror="this.style.display='none'">
  <div><h2 style="margin:0">{escape(name)}</h2>
  <div class="no">SIIR # {d['id']} · {escape(str(d.get('label','')))} · {escape(str(d.get('weight','')))} weight</div></div>
 </div>
 <div class="row"><b>holder</b><code>{escape(str(owner))}</code></div>
 <div class="row"><b>round</b><span>{escape(str(d.get('round','')))}</span></div>
 <div class="row"><b>created</b><span>{escape(str(d.get('createdAt','')))}</span></div>
 <div class="row"><b>claimable</b><span>{claim}</span></div>
 <div class="row"><b>fingerprint</b><code>{escape(str(d.get('fingerprint','')))}</code></div>
 <div class="row"><b>metadata</b><code>{escape(str(d.get('metadataUri','')))}</code></div>
 <h3 style="margin:18px 0 6px">Provenance</h3>
 <table><tr><th>from</th><th>to</th><th>timestamp</th></tr>
 {hist or '<tr><td colspan=3>—</td></tr>'}</table>
</div>
<div class="print"><img src="/company/{addr}/deed" alt="deed image" style="max-width:100%;border-radius:12px" onerror="this.style.display='none'"></div>
<p><a href="/company/{addr}/siir/{d['id']}">SIIR page</a> · <a href="/company/{addr}/holder/{owner_link}">holder</a> ·
<a href="/company/{addr}/">company</a></p>
</body></html>"""


def siir_page(addr, id_s):
    d = siir_data(addr, id_s)
    if "error" in d:
        return f"<!doctype html><html><body><p>{escape(d['error'])}</p></body></html>"
    owner = d.get("owner", "")
    owner_link = owner.split(":")[-1]
    w = gateway_wallet()
    mine = bool(w and owner == w[0])
    claim_btn = (
        f'<p><a href="/company/{addr}/claim"><button>claim dividends</button></a></p>'
        if mine else ""
    )
    hist = "".join(
        f"<tr><td>{escape(h.get('from',''))}</td><td>{escape(h.get('to',''))}</td>"
        f"<td>{escape(str(h.get('timestamp','')))}</td></tr>"
        for h in d.get("history", [])
    )
    plans = lazy_mirror(addr).plans_abi() if lazy_mirror(addr) else []
    seal = seal_svg(d.get("label", ""), as_int(d.get("round", 0)), d.get("id", 0), plans)
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR #{d['id']}</title>
 <style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
 table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
 pre{{background:#f6f6f6;padding:8px;border-radius:8px;white-space:pre-wrap;word-break:break-all}}
 a{{color:#1d4ed8}}svg.seal{{max-width:230px;height:auto}}</style></head><body>
 <h1>SIIR #{d['id']}</h1>
 {seal}
 <p><a href="/company/{addr}/">company</a> · <a href="/company/{addr}/explore">explore</a> ·
 <a href="/company/{addr}/siir/{d['id']}/deed">deed card</a></p>
{claim_btn}
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
    w = gateway_wallet()
    claim_btn = (
        f'<p><a href="/company/{addr}/claim"><button>claim dividends</button></a></p>'
        if w and owner == w[0] else ""
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>holder {owner}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
a{{color:#1d4ed8}}</style></head><body>
<h1>Holder</h1>
<p><code>{escape(owner)}</code> · {escape(str(d['company']))}</p>
<p>balance: <b>{escape(str(d['balance']))}</b> SIIRs · claimable: {claim}</p>
{claim_btn}
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
        for c, i, d in non_shell_tracks(divs)
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


def deploy_form_page(addr):
    """Founder-wallet company deploy form (dev/ops only, requires --writes).
    Signing happens here on the gateway with scripts/.work/holder.keys.json;
    the private key never leaves the server. POSTs JSON to the same URL."""
    w = gateway_wallet()
    wallet = (w[0] if w else "") or ""
    plans_rows = "".join(
        '<tr><td><input name="p-count" class="num" value="1" placeholder="count"></td>'
        '<td><input name="p-weight" class="num" value="1000" placeholder="weight"></td>'
        '<td><input name="p-label" placeholder="label (e.g. early birds)"></td></tr>'
        for _ in range(3))
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>deploy company — SIIR</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 16px;color:#111}}
label{{display:block;margin:10px 0 4px;font-weight:600;font-size:14px}}
input,select,textarea{{width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:13px ui-monospace,Menlo,Consolas,monospace}}
input.num{{width:110px}} table{{border-collapse:collapse;width:100%}} td{{padding:4px}}
button{{cursor:pointer;font:inherit;font-weight:700;background:#1d4ed8;color:#fff;border:0;border-radius:9px;padding:10px 18px;margin-top:14px}}
.ok{{color:#15803d}} .err{{color:#b91c1c}} .mut{{color:#64748b;font-size:13px}}
#out{{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font:12px ui-monospace,monospace;display:none}}
a{{color:#1d4ed8}}</style></head><body>
<h1>Deploy a company</h1>
<p class="mut">the gateway's wallet (<code>{escape(wallet)}</code>) calls <code>factory.deployCompany</code>
as an internal message attaching SHELL fuel; the factory converts exactly the child reserve + gas and refunds
the excess. Signing happens on this server with the gateway's key — it never leaves.</p>
<form id="df">
<label>company name</label><input id="f-name" required placeholder="Acme SIIRs">
<label>description</label><input id="f-desc" placeholder="one line about the company">
<label>website</label><input id="f-web" placeholder="https://…">
<div style="display:flex;gap:14px;flex-wrap:wrap">
<div style="flex:1"><label>issuance model</label>
<select id="f-model"><option value="0">full-cap (classic)</option><option value="1">rounds</option></select></div>
<div style="flex:1"><label>initial value (per SIIR, raw)</label>
<input id="f-init" value="20000000000"></div></div>
<label>plans (count · weight · label — one row per tier)</label>
<table>{plans_rows}</table>
<label>founder (default: gateway wallet)</label>
<input id="f-founder" placeholder="{escape(wallet)}">
<label>founder pubkey (optional — a fresh 0x… pubkey makes a unique company address; the factory
derives it from founder+pubkey, so reuse collides with existing companies)</label>
<input id="f-pub" placeholder="0x…">
<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="f-gov" style="width:auto">
governance enabled</label>
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="f-gov2" style="width:auto">
governance v2</label>
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="f-ld" style="width:auto">
locked dividends</label>
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="f-c" style="width:auto">
sealed charter</label></div>
<p><button type="submit">deploy</button> <span class="mut">~30s settle</span></p>
</form>
<div id="out"></div>
<script>
var FORM=document.getElementById('df');
FORM.addEventListener('submit',function(e){{
  e.preventDefault();
  var plans=[];
  document.querySelectorAll('#df table tr').forEach(function(tr){{
    var c=tr.querySelector('[name=p-count]'),w=tr.querySelector('[name=p-weight]'),
        l=tr.querySelector('[name=p-label]');
    if(c&&w&&l&&parseInt(c.value,10)>0&&l.value.trim())
      plans.push({{count:parseInt(c.value,10),weight:parseInt(w.value,10),label:l.value.trim()}});
  }});
  var body={{name:document.getElementById('f-name').value,
    description:document.getElementById('f-desc').value,
    website:document.getElementById('f-web').value,
    issuanceModel:parseInt(document.getElementById('f-model').value,10),
    initialValue:parseInt(document.getElementById('f-init').value,10),
    plans:plans,
    founder:document.getElementById('f-founder').value||null,
    founderPubkey:document.getElementById('f-pub').value||null,
    governanceEnabled:document.getElementById('f-gov').checked,
    governanceV2:document.getElementById('f-gov2').checked,
    lockedDividends:document.getElementById('f-ld').checked,
    sealedCharter:document.getElementById('f-c').checked}};
  var out=document.getElementById('out');
  out.style.display='block';out.textContent='sending…';
  fetch('/factory/{escape(addr)}/deploy',{{method:'POST',
    headers:{{'Content-Type':'application/json'}},
    body:JSON.stringify(body)}})
   .then(function(r){{return r.json()}})
   .then(function(j){{
     if(j.error){{out.className='err';out.textContent='error: '+j.error;return}}
     out.className='ok';
     out.textContent='company: '+j.company+'\\nmodel: '+j.issuanceModel+
       '\\nstatus: '+(j.settled?'settled ✓':'pending…')+'\\ntxid: '+(j.txid||'?');
   }}).catch(function(e){{out.className='err';out.textContent='failed: '+e;}});
}});
</script>
<p class="mut"><a href="/factory/{escape(addr)}/">factory directory</a></p>
</body></html>"""


def factory_page(addr):
    info = run_getter(addr, "getCompanyList") or {}
    count = run_getter(addr, "getCompanyCount") or {}
    mkt = run_getter(addr, "getMarketplaceAddress") or {}
    rows = "".join(
        f"<li><a href=\"/company/{a}/\">{escape(n)}</a> "
        f"(model {'rounds' if int(m or 0) == 1 else 'full-cap'}) "
        f"<a href=\"/company/{a}/explore\">explore</a> "
        f"<small><code>{escape(a)}</code></small></li>"
        for a, n, m in zip(
            info.get("company", []), info.get("name", []), info.get("issuanceModel", []))
    )
    mkt_href = f"<a href=\"/marketplace/{escape(mkt.get('value0',''))}/\">{escape(mkt.get('value0',''))}</a>" if mkt.get("value0") else "<em>none</em>"
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR factory directory</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
a{{color:#1d4ed8}} li{{margin:6px 0}} code{{font-size:12px}}</style></head><body>
<h1>SIIR factory directory</h1>
<p>companies registered in <code>{escape(addr)}</code> — read straight from the factory's
on-chain registry (mirror decode).</p>
<p><strong>{count.get('count', '?')}</strong> registered · marketplace: {mkt_href}</p>
{'<p><a href="/factory/%s/deploy">deploy a company (gateway wallet)</a></p>' % escape(addr) if ALLOW_WRITES else ''}
<ul>{rows or '<li>no companies registered</li>'}</ul>
<p><small><a href="/factory/">back to factory index</a></small></p></body></html>"""
    return body


_PAGE_CSS = """
:root{--fg:#0f172a;--mut:#64748b;--acc:#2563eb;--bg:#f1f5f9;--card:#fff;--line:#e2e8f0}
*{box-sizing:border-box}
body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:var(--bg);color:var(--fg);line-height:1.55}
header{background:#0f172a;color:#e2e8f0;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header .brand{font-weight:800;color:#fff;text-decoration:none}
header form{flex:1 1 320px;display:flex;gap:8px}
header input{flex:1;font:13px ui-monospace,Menlo,Consolas,monospace;padding:9px 12px;border:1px solid #334155;border-radius:9px;background:#1e293b;color:#f1f5f9;outline:none}
header input:focus{border-color:var(--acc)}
button{cursor:pointer;font:inherit;font-weight:600}
button.primary{background:var(--acc);color:#fff;border:0;border-radius:9px;padding:9px 16px}
button.primary:hover{background:#1d4ed8}
main{max-width:1020px;margin:0 auto;padding:22px 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:0 0 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);margin:0 0 12px;font-weight:700}
p{margin:4px 0}
.mut{color:var(--mut)}
.addr{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;word-break:break-all}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mut);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em}
tbody tr:hover{background:#f8fafc}
.chip{display:inline-block;border:1px solid #cbd5e1;background:var(--card);border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;cursor:pointer;margin:0 8px 8px 0}
.chip.on{background:var(--acc);border-color:var(--acc);color:#fff}
.tok{display:inline-block;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700}
.tok.nk{color:#b45309;background:#fef3c7}.tok.sh{color:#0f766e;background:#ccfbf1}.tok.us{color:#1d4ed8;background:#dbeafe}.tok.ot{color:#64748b;background:#f1f5f9}
.state{font-size:12px;font-weight:700;border-radius:6px;padding:1px 8px}
.state.open{color:#059669;background:#d1fae5}.state.closed{color:#64748b;background:#f1f5f9}
.escrow{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px}
.escrow .lab{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.escrow .full{display:none;font:12.5px ui-monospace,Menlo,Consolas,monospace;word-break:break-all;background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 10px;flex:1 1 100%}
.escrow .full.show{display:block}
.escrow .hint{font-size:11.5px;color:var(--mut)}
.empty{color:var(--mut);font-size:13px;padding:8px 0}
footer{color:#64748b;font-size:12px;text-align:center;padding:26px}
a{color:#1d4ed8}
"""

_ESCROW_JS = """
<script>
(function(){var b=document.getElementById('esc-copy');if(!b)return;
var f=document.getElementById('esc-full'),t=null,held=false;
b.addEventListener('pointerdown',function(){held=false;t=setTimeout(function(){held=true;f.classList.add('show');},600);});
b.addEventListener('pointerup',function(){clearTimeout(t);});
b.addEventListener('pointerleave',function(){clearTimeout(t);});
b.addEventListener('pointercancel',function(){clearTimeout(t);});
b.addEventListener('click',function(){if(held){held=false;return;}
var a=b.getAttribute('data-addr');
var ok=function(){b.textContent='copied';setTimeout(function(){b.textContent=b.getAttribute('data-label');},1400);};
try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(a).then(ok,ok);}else{ok();}}catch(e){ok();}});
document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){
document.querySelectorAll('.chip').forEach(function(x){x.classList.remove('on')});c.classList.add('on');
var cur=c.getAttribute('data-cur');
document.querySelectorAll('table[data-filter] tr[data-cur]').forEach(function(r){r.style.display=(cur==='all'||r.getAttribute('data-cur')===cur)?'':'none';});
});});
})();
</script>
"""


def _escrow_card(addr, label="copy escrow address"):
    """Escrow address card: one click copies, hold ~0.6s reveals the full value."""
    return f"""<div class="escrow">
<div><div class="lab">escrow account (marketplace contract)</div>
<div class="addr mut" style="margin-top:2px">{escape(addr)}</div></div>
<button class="primary" id="esc-copy" data-addr="{escape(addr)}" data-label="{escape(label)}">{escape(label)}</button>
<span class="hint">hold 0.6s to reveal &middot; click to copy</span>
<div class="full addr" id="esc-full">{escape(addr)}</div></div>"""


def _market_tok(cid):
    return {"1": ("NACKL", "nk"), "2": ("SHELL", "sh"), "3": ("eccUSDC", "us")}.get(
        str(cid), (str(cid), "ot"))


def _page(html, title="SIIR market", q=""):
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{_PAGE_CSS}</style></head><body>
<header><a class="brand" href="/">SIIR market</a>
<form action="/search" method="get"><input type="search" name="q" placeholder="search companies or paste dapp_id::account_id" spellcheck="false" value="{escape(q)}"><button class="primary">search</button></form></header>
<main>{html}</main>
<footer>read-only &middot; every value here is decoded from the contracts on-chain via the shellnet mirror node</footer>
{_ESCROW_JS}</body></html>"""


def marketplace_page(addr, q=""):
    listings = run_getter(addr, "getListings") or {}
    bids = run_getter(addr, "getBids") or {}
    n_list = run_getter(addr, "getListingCount") or {}
    n_bids = run_getter(addr, "getBidCount") or {}
    book = market_stats(addr)
    def tok(cid):
        n, c = _market_tok(cid)
        return f'<span class="tok {c}">{escape(n)}</span>'
    def money(x):
        return "—" if x is None else f'{int(x):,}'
    srows = "".join(
        f"<tr><td>{tok(cid)}</td>"
        f"<td>{money(s.get('bestBid'))}</td><td>{money(s.get('bestAsk'))}</td>"
        f"<td>{money(s.get('mark'))}</td>"
        f"<td>{money(s.get('spread'))}</td>"
        f"<td>{s.get('openBids', 0)}</td><td>{s.get('openAsks', 0)}</td>"
        f"<td>{money(s.get('bidValue'))}</td><td>{money(s.get('askValue'))}</td></tr>"
        for cid, s in sorted(book.items(), key=lambda kv: kv[0])
    )
    stats_card = f"""<div class="card"><h2>market stats</h2>
<p class="mut">live order book only — Acki Nacki keeps no on-chain trade history,
so last-trade price and volume are deliberately absent. mark = mid of best bid/ask
(or the live side when only one exists). valuation is market-determined.</p>
<table><tr><th>token</th><th>best bid</th><th>best ask</th><th>mark</th><th>spread</th>
<th>bids</th><th>asks</th><th>bid value</th><th>ask value</th></tr>
{srows or '<tr><td colspan=9 class="empty">empty book — no open orders</td></tr>'}</table>
<p><small><a href="/marketplace/{escape(addr)}/stats.json">stats.json</a></small></p></div>"""
    lrows = "".join(
        f'<tr data-cur="{escape(cid)}"><td>#{escape(i)}</td><td><a href="/company/{escape(c)}/">'
        f'{escape(c.split("::")[1][:10])}…</a></td>'
        f'<td><a href="/company/{escape(c)}/siir/{escape(s)}">#{escape(s)}</a></td>'
        f'<td><code>{escape(seller)}</code></td><td>{price} {tok(cid)}</td>'
        f'<td><span class="state {"open" if act else "closed"}">{"open" if act else "closed"}</span></td></tr>'
        for i, c, s, seller, price, cid, _t, act in zip(
            listings.get("ids", []), listings.get("company", []), listings.get("siirIds", []),
            listings.get("seller", []), listings.get("askPrice", []),
            listings.get("currencyId", []), listings.get("listedAt", []),
            listings.get("active", []))
    )
    brows = "".join(
        f'<tr data-cur="{escape(cid)}"><td>#{escape(i)}</td><td><code>{escape(bidder)}</code></td>'
        f'<td><a href="/company/{escape(c)}/">…</a></td>'
        f'<td><a href="/company/{escape(c)}/siir/{escape(s)}">#{escape(s)}</a></td>'
        f'<td>{price} {tok(cid)}</td>'
        f'<td><span class="state {"closed" if acc else "open"}">{"spent" if acc else "open"}</span></td></tr>'
        for i, bidder, c, s, price, cid, _v, acc in zip(
            bids.get("ids", []), bids.get("bidder", []), bids.get("company", []),
            bids.get("siirIds", []), bids.get("price", []), bids.get("currencyId", []),
            bids.get("validUntil", []), bids.get("accepted", []))
    )
    n_open = sum(1 for a in listings.get("active", []) if a)
    html = f"""<div class="card">
<h1>marketplace</h1>
<p class="mut">custodial escrow exchange for SIIR deeds at <code>{escape(addr)}</code> —
NACKL, SHELL and eccUSDC pairs trade here. State decoded from the marketplace contract.</p>
<p><strong>{escape(n_list.get("count", "?"))}</strong> listings &middot;
<strong>{escape(n_bids.get("count", "?"))}</strong> bids &middot;
<strong>{n_open}</strong> open</p></div>
<div class="card"><h2>escrow</h2>
<p class="mut">all trades settle through the custodial escrow (the marketplace contract). one click
copies the address; hold the button to reveal the full value.</p>
{_escrow_card(addr)}</div>
{stats_card}
<div class="card"><h2>tokens</h2>
<button class="chip on" data-cur="all">all tokens</button>
<button class="chip" data-cur="1">NACKL</button>
<button class="chip" data-cur="2">SHELL</button>
<button class="chip" data-cur="3">eccUSDC</button>
<p class="mut" style="font-size:12.5px">filter listings and offers by trading token.</p></div>
<div class="card"><h2>ask listings</h2>
<table data-filter="1"><tr><th>id</th><th>company</th><th>deed</th><th>seller</th><th>ask</th><th>state</th></tr>{lrows or '<tr><td colspan=6 class="empty">none</td></tr>'}</table></div>
<div class="card"><h2>buy offers</h2>
<table data-filter="1"><tr><th>id</th><th>bidder</th><th>company</th><th>deed</th><th>price</th><th>state</th></tr>{brows or '<tr><td colspan=6 class="empty">none</td></tr>'}</table></div>
<p><small><a href="/marketplace/{escape(addr)}/listings.json">listings.json</a> &middot;
<a href="/marketplace/{escape(addr)}/bids.json">bids.json</a></small></p>"""
    return _page(html, "SIIR marketplace")


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
    gov_rows = ""
    try:
        gov = run_getter(addr, "getGovernance") or {}
        if gov:
            rule = {0: "treasury→founder", 1: "charity", 2: "DAO",
                    3: "burn"}.get(int(gov.get("dissolutionRule") or 0), "?")
            gov_rows = (
                f"<p>governance: <b class=\"{{'ok' if gov.get('governanceEnabled') else 'no'}}\">"
                f"{'enabled' if gov.get('governanceEnabled') else 'founder-only'}</b> · "
                f"quorum {gov.get('quorumPermille', 0)}‰ · "
                f"votes {gov.get('dissolveVotes', 0)} / {gov.get('totalWeight', 0)} weight</p>"
                f"<p>status: <b class=\"{{'no' if gov.get('dissolved') else 'ok'}}\">"
                f"{'DISSOLVED' if gov.get('dissolved') else 'operating'}</b> · "
                f"unclaimed rule: {rule} · "
                f"finalDeposit {'yes' if gov.get('finalDeposited') else 'no'} · "
                f"finalized {'yes' if gov.get('finalized') else 'no'}"
                f"</p>"
            )
            if gov.get("dissolved"):
                gov_rows += (f"<p><small>dissolved {gov.get('dissolvedAt')} · "
                             f"grace ends {gov.get('graceEnd')}</small></p>")
    except Exception:
        pass
    if not gov_rows:
        gov_rows = "<p><small>unavailable</small></p>"
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
<div class="card"><h3>Governance &amp; dissolution</h3>{gov_rows}</div>
<p><a href="/company/{addr}/info">info.json</a> ·
   <a href="/company/{addr}/charter">charter.json</a> ·
   <a href="/company/{addr}/explore">explore register</a> ·
   <a href="/company/{addr}/analytics.json">analytics.json</a> ·
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
        if parts[0] == "search":
            return self.search((qs.get("q") or [""])[0])
        if parts[0] == "company":
            if len(parts) < 2:
                return self._send(b"missing address", "text/plain", 400)
            addr = parts[1]
            return self.company_resource(addr, parts[2:], qs)
        if parts[0] == "factory":
            if len(parts) < 2:
                return self.factory_index()
            addr = parts[1]
            if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
                return self._send(b"bad address (want dapp_id::account_id)",
                                  "text/plain", 400)
            data = run_getter(addr, "getCompanyList", abi=FACTORY_ABI)
            if data is None:
                return self._send(b"factory unreachable", "text/plain", 503)
            if len(parts) > 2 and parts[2] == "deploy":
                if not ALLOW_WRITES:
                    return self._send(b"writes disabled (run with --writes)",
                                      "text/plain", 403)
                return self._send(deploy_form_page(addr).encode(),
                                  "text/html; charset=utf-8")
            if len(parts) > 2 and parts[2] == "companies.json":
                return self._send(json.dumps({
                    "companies": load_companies_from(addr),
                    "count": (run_getter(addr, "getCompanyCount", abi=FACTORY_ABI) or {}).get("count"),
                    "marketplace": (run_getter(addr, "getMarketplaceAddress", abi=FACTORY_ABI) or {}).get("value0", ""),
                }).encode(), "application/json")
            return self._send(factory_page(addr).encode(),
                              "text/html; charset=utf-8")
        if parts[0] == "marketplace":
            if len(parts) < 2:
                return self._send(b"missing address", "text/plain", 400)
            addr = parts[1]
            if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
                return self._send(b"bad address (want dapp_id::account_id)",
                                  "text/plain", 400)
            data = run_getter(addr, "getListings", abi=MARKETPLACE_ABI)
            if data is None:
                return self._send(b"marketplace unreachable", "text/plain", 503)
            if len(parts) > 2 and parts[2] == "stats.json":
                return self._send(
                    json.dumps(market_stats(addr)).encode(),
                    "application/json")
            if len(parts) > 2 and parts[2] in ("listings.json", "bids.json"):
                key = "getListings" if parts[2] == "listings.json" else "getBids"
                return self._send(
                    json.dumps(run_getter(addr, key, abi=MARKETPLACE_ABI) or {}).encode(),
                    "application/json")
            return self._send(marketplace_page(addr).encode(),
                              "text/html; charset=utf-8")
        if parts[0] == "static":
            # static client-side explorer (static/index.html + core/app/fields.js)
            rel = "/".join(parts[1:]) or "index.html"
            base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
            fp = os.path.normpath(os.path.join(base, rel))
            if not fp.startswith(os.path.normpath(base)):
                return self._send(b"forbidden", "text/plain", 403)
            if not os.path.isfile(fp):
                return self._send(b"not found", "text/plain", 404)
            ctype = {
                ".html": "text/html; charset=utf-8",
                ".js": "text/javascript",
                ".css": "text/css",
            }.get(os.path.splitext(fp)[1], "application/octet-stream")
            with open(fp, "rb") as f:
                return self._send(f.read(), ctype)
        return self._send(b"not found", "text/plain", 404)

    def index(self):
        factory = default_factory()
        mkt = ""
        n_list = n_bids = "?"
        n_open = 0
        lrows = brows = ""
        if factory:
            mkt = (run_getter(factory, "getMarketplaceAddress", abi=FACTORY_ABI) or {}).get("value0", "")
        if mkt:
            listings = run_getter(mkt, "getListings", abi=MARKETPLACE_ABI) or {}
            bids = run_getter(mkt, "getBids", abi=MARKETPLACE_ABI) or {}
            n_list = (run_getter(mkt, "getListingCount", abi=MARKETPLACE_ABI) or {}).get("count", "?")
            n_bids = (run_getter(mkt, "getBidCount", abi=MARKETPLACE_ABI) or {}).get("count", "?")
            n_open = sum(1 for a in listings.get("active", []) if a)
            def tok(cid):
                n, c = _market_tok(cid)
                return f'<span class="tok {c}">{escape(n)}</span>'
            lrows = "".join(
                f'<tr data-cur="{escape(cid)}"><td>#{escape(i)}</td>'
                f'<td><a href="/company/{escape(c)}/">{escape(c.split("::")[1][:10])}…</a></td>'
                f'<td><a href="/company/{escape(c)}/siir/{escape(s)}">#{escape(s)}</a></td>'
                f'<td><code>{escape(seller)}</code></td><td>{price} {tok(cid)}</td>'
                f'<td><span class="state {"open" if act else "closed"}">{"open" if act else "closed"}</span></td></tr>'
                for i, c, s, seller, price, cid, _t, act in zip(
                    listings.get("ids", []), listings.get("company", []), listings.get("siirIds", []),
                    listings.get("seller", []), listings.get("askPrice", []),
                    listings.get("currencyId", []), listings.get("listedAt", []),
                    listings.get("active", []))
            )
            brows = "".join(
                f'<tr data-cur="{escape(cid)}"><td>#{escape(i)}</td><td><code>{escape(bidder)}</code></td>'
                f'<td><a href="/company/{escape(c)}/siir/{escape(s)}">#{escape(s)}</a></td>'
                f'<td>{price} {tok(cid)}</td>'
                f'<td><span class="state {"closed" if acc else "open"}">{"spent" if acc else "open"}</span></td></tr>'
                for i, bidder, c, s, price, cid, _v, acc in zip(
                    bids.get("ids", []), bids.get("bidder", []), bids.get("company", []),
                    bids.get("siirIds", []), bids.get("price", []), bids.get("currencyId", []),
                    bids.get("validUntil", []), bids.get("accepted", []))
            )
        escrow_html = _escrow_card(mkt) if mkt else '<p class="empty">no marketplace configured on the factory.</p>'
        stats_html = ""
        if mkt:
            book = market_stats(mkt)
            def money(x):
                return "—" if x is None else f'{int(x):,}'
            srows = "".join(
                f"<tr><td>{tok(cid)}</td>"
                f"<td>{money(s.get('bestBid'))}</td><td>{money(s.get('bestAsk'))}</td>"
                f"<td>{money(s.get('mark'))}</td>"
                f"<td>{money(s.get('spread'))}</td>"
                f"<td>{s.get('openBids', 0)}</td><td>{s.get('openAsks', 0)}</td></tr>"
                for cid, s in sorted(book.items(), key=lambda kv: kv[0]))
            stats_html = f"""<div class="card"><h2>market stats</h2>
<p class="mut">live order book only (Acki Nacki keeps no on-chain trade history — no last-trade or
volume). mark = mid of best bid/ask, or the live side when only one exists. valuation is
market-determined.</p>
<table><tr><th>token</th><th>best bid</th><th>best ask</th><th>mark</th><th>spread</th><th>bids</th><th>asks</th></tr>
{srows or '<tr><td colspan=7 class="empty">empty book — no open orders</td></tr>'}</table></div>"""
        html = f"""<div class="card" style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#f1f5f9;border:0">
<h1 style="color:#fff">SIIR on-chain market</h1>
<p class="mut" style="color:#94a3b8;max-width:560px">A custodial escrow exchange for SIIR deeds on the
Acki Nacki chain. NACKL, SHELL and eccUSDC pairs trade here. Every number on this page is decoded
from the contracts on-chain via the public mirror node.</p>
<p><strong style="color:#fff">{escape(n_list)}</strong> listings &middot;
<strong style="color:#fff">{escape(n_bids)}</strong> bids &middot;
<strong style="color:#fff">{n_open}</strong> open &middot;
<a href="/factory/{escape(factory)}/">directory</a> &middot;
<a href="/marketplace/{escape(mkt)}/">marketplace page</a></p>
</div>
{stats_html}
<div class="card"><h2>escrow</h2>
<p class="mut">all trades settle through the custodial escrow (the marketplace contract). one click
copies the address; hold the button to reveal the full value.</p>
{escrow_html}</div>
<div class="card"><h2>tokens</h2>
<button class="chip on" data-cur="all">all tokens</button>
<button class="chip" data-cur="1">NACKL</button>
<button class="chip" data-cur="2">SHELL</button>
<button class="chip" data-cur="3">eccUSDC</button>
<p class="mut" style="font-size:12.5px">filter listings and offers by trading token. companies and their
SIIRs are reachable only through the search bar.</p></div>
<div class="card"><h2>ask listings</h2>
<table data-filter="1"><tr><th>id</th><th>company</th><th>deed</th><th>seller</th><th>ask</th><th>state</th></tr>{lrows or '<tr><td colspan=6 class="empty">none yet — trades show up here the moment they are listed on-chain</td></tr>'}</table></div>
<div class="card"><h2>buy offers</h2>
<table data-filter="1"><tr><th>id</th><th>bidder</th><th>deed</th><th>price</th><th>state</th></tr>{brows or '<tr><td colspan=5 class="empty">none yet</td></tr>'}</table></div>"""
        return self._send(_page(html, "SIIR market").encode(), "text/html; charset=utf-8")

    def search(self, q):
        q = (q or "").strip()
        if re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", q):
            return self._send(_page(
                f'<div class="card"><h1>opening address</h1><p class="mut">looks like a contract '
                f'address — <a href="/company/{escape(q)}/">open the company page</a>.</p></div>',
                "search: " + q, q).encode(), "text/html; charset=utf-8")
        if not q:
            return self.index()
        ql = q.lower()
        companies = load_companies()
        hits = [c for c in companies
                if ql in (c.get("name") or "").lower() or ql in (c.get("address") or "").lower()]
        rows = "".join(
            f'<tr><td>{c.get("index", "?")}</td>'
            f'<td><a href="/company/{escape(c.get("address", ""))}/">{escape(c.get("name") or "(unnamed)")}</a></td>'
            f'<td>{escape("rounds" if int(c.get("issuanceModel") or 0) == 1 else "full-cap")}</td>'
            f'<td><code class="addr">{escape(c.get("address", ""))}</code></td></tr>'
            for c in hits)
        html = f"""<div class="card"><h1>search</h1>
<p class="mut">matches "{escape(q)}" against the factory registry
({escape(str(len(companies)))} companies). SIIRs are only reachable through their company.</p></div>
<div class="card"><h2>results ({len(hits)})</h2>
<table><tr><th>#</th><th>name</th><th>model</th><th>company (dapp::acct)</th></tr>
{rows or f'<tr><td colspan=4 class="empty">no company named or addressed "{escape(q)}". try a partial name.</td></tr>'}</table></div>"""
        return self._send(_page(html, "search: " + q, q).encode(), "text/html; charset=utf-8")

    def factory_index(self):
        factory = default_factory()
        if not factory:
            return self._send(b"no factory configured (scripts/.work/factory.addr)",
                              "text/plain", 404)
        return self._send(factory_page(factory).encode(), "text/html; charset=utf-8")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path).strip("/")
        parts = path.split("/") if path else []
        qs = parse_qs(parsed.query)
        if parts[:1] == ["factory"] and len(parts) >= 3 and parts[2:] == ["deploy"]:
            factory = parts[1]
            if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", factory):
                return self._send(b"bad factory address (want dapp_id::account_id)",
                                  "text/plain", 400)
            if not ALLOW_WRITES:
                return self._send(_writes_blocked(factory).encode(),
                                  "text/html; charset=utf-8", 403)
            if _rate_limited(self.client_address[0]):
                return self._send(b"rate limit exceeded (write endpoints)",
                                  "text/plain", 429)
            return self.factory_deploy(factory)
        if parts[:1] == ["company"] and len(parts) >= 2:
            addr = parts[1]
            if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
                return self._send(b"bad address (want dapp_id::account_id)",
                                  "text/plain", 400)
            if parts[2:] == ["claim"]:
                if not ALLOW_WRITES:
                    return self._send(_writes_blocked(addr).encode(),
                                      "text/html; charset=utf-8", 403)
                if _rate_limited(self.client_address[0]):
                    return self._send(b"rate limit exceeded (write endpoints)",
                                      "text/plain", 429)
                return self.company_claim(addr, qs)
        return self._send(b"not found", "text/plain", 404)

    def _read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b""
        ctype = self.headers.get("Content-Type", "")
        if not raw:
            return {}
        if "application/json" in ctype:
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return None
        return {k: v[0] for k, v in parse_qs(raw.decode("utf-8", "replace")).items()}

    def factory_deploy(self, factory):
        body = self._read_body()
        if body is None:
            return self._send(b"bad JSON body", "text/plain", 400)
        r = do_deploy(factory, body)
        return self._send(json.dumps(r).encode(), "application/json")

    def company_claim(self, addr, qs):
        body = self._read_body()
        if body is None:
            return self._send(b"bad JSON body", "text/plain", 400)
        ids = body.get("ids")
        if isinstance(ids, str):
            ids = ids.split(",")
        if not ids:
            ids = (qs.get("ids") or [""])[0].split(",")
        ids = [i for i in ids if str(i).strip().isdigit()]
        if not ids:
            return self._send(b"no ids given (send {\"ids\":[\"1\",\"2\"]})",
                              "text/plain", 400)
        r = do_claim(addr, [int(i) for i in ids])
        if "application/json" in (self.headers.get("Accept") or ""):
            return self._send(json.dumps(r).encode(), "application/json")
        return self._send(claim_result_page(addr, r).encode(),
                          "text/html; charset=utf-8")

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
        if what == "governance":
            self._send(json.dumps(run_getter(addr, "getGovernance") or {}).encode(),
                        "application/json")
            return
        if what == "explore":
            return self._send(explore_page(addr, qs).encode(),
                              "text/html; charset=utf-8")
        if what == "full":
            return self._send(json.dumps(full_data(addr)).encode(),
                              "application/json")
        if what in ("analytics", "analytics.json", "statement", "statement.json"):
            return self._send(json.dumps(company_analytics(addr)).encode(),
                              "application/json")
        if what in ("register", "register.json"):
            return self._send(json.dumps(register_data(addr, qs)).encode(),
                              "application/json")
        if what in ("holders", "holders.json"):
            return self._send(json.dumps(holders_data(addr)).encode(),
                              "application/json")
        if what == "holder" and len(rest) > 2 and rest[2] == "statement.csv":
            return self._send(
                holder_statement_csv(addr, rest[1]).encode(),
                "text/csv; charset=utf-8",
                extra={"Content-Disposition":
                       'attachment; filename="holder-statement.csv"'})
        if what in ("holder", "holder.json") and len(rest) > 1:
            if what == "holder":
                return self._send(holder_page(addr, rest[1]).encode(),
                                  "text/html; charset=utf-8")
            return self._send(json.dumps(holder_data(addr, rest[1])).encode(),
                              "application/json")
        if what == "siir" and len(rest) > 1:
            if len(rest) > 2 and rest[2] == "deed":
                return self._send(deed_page(addr, rest[1]).encode(),
                                  "text/html; charset=utf-8")
            return self._send(siir_page(addr, rest[1]).encode(),
                              "text/html; charset=utf-8")
        if what == "claim":
            if ALLOW_WRITES:
                return self._send(claim_form_page(addr).encode(),
                                  "text/html; charset=utf-8")
            return self._send(_writes_blocked(addr).encode(),
                              "text/html; charset=utf-8", 403)
        if what == "siir.json" and len(rest) > 1:
            return self._send(json.dumps(siir_data(addr, rest[1])).encode(),
                              "application/json")
        if what == "plans":
            plans = (run_getter(addr, "getPlans") or {}).get("plans", [])
            return self._send(json.dumps(plans).encode(), "application/json")
        if what == "treasury":
            divs = run_getter(addr, "getDividendCurrencies") or {}
            tracks = non_shell_tracks(divs)
            return self._send(
                json.dumps({"ids": [c for c, _, _ in tracks],
                            "indices": [i for _, i, _ in tracks],
                            "deposits": [d for _, _, d in tracks]}).encode(),
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
    global NET, DEBUG, WALLET_ABI, ALLOW_WRITES
    ap = argparse.ArgumentParser(description="SIIR on-chain content gateway")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--net", default="shellnet.ackinacki.org")
    ap.add_argument("--writes", action="store_true",
                    help="enable write endpoints (POST /claim) using the local "
                         "scripts/.work/*.keys.json — DEV NETWORKS ONLY. Per the "
                         "gas model, production signers own their wallets; the "
                         "gateway is read-only by default.")
    ap.add_argument("--multisig-abi",
                    help="path to UpdateCustodianMultisigWallet.abi.json "
                         "(defaults: repo/contracts/0.79.3_compiled/..., "
                         "/tmp/opencode/acki-research/ackinacki/...)")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    NET = args.net
    DEBUG = args.debug
    ALLOW_WRITES = args.writes
    if args.multisig_abi:
        MULTISIG_ABI_PATHS.insert(0, args.multisig_abi)
    WALLET_ABI = next((p for p in MULTISIG_ABI_PATHS if os.path.exists(p)), None)
    if WALLET_ABI is None:
        log("warning: multisig ABI not found; /claim will be disabled")
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    log(f"listening on http://127.0.0.1:{args.port}  (net={NET})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    main()