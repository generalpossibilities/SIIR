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
  GET /company/<addr>/plans, /treasury, /history/<id>   JSON
  GET /company/<addr>/search?q=...        address -> holder page; else label/metadata/owner scan

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
    if method == "getVersion":
        return {"value0": "2.0.0", "value1": "CompanySIIR"}
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
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


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
        total += sum(as_int(a) for a in cl.get("amounts", []))
    return total


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
        pairs = list(zip(cl.get("currencies", []), cl.get("amounts", [])))
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
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR #{d['id']}</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;color:#111}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}
pre{{background:#f6f6f6;padding:8px;border-radius:8px;white-space:pre-wrap;word-break:break-all}}
a{{color:#1d4ed8}}</style></head><body>
<h1>SIIR #{d['id']}</h1>
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
<ul>{rows or '<li>no companies registered</li>'}</ul>
<p><small><a href="/factory/">back to factory index</a></small></p></body></html>"""
    return body


def marketplace_page(addr):
    listings = run_getter(addr, "getListings") or {}
    bids = run_getter(addr, "getBids") or {}
    n_list = run_getter(addr, "getListingCount") or {}
    n_bids = run_getter(addr, "getBidCount") or {}
    cur = {"1": "NACKL", "2": "SHELL", "3": "eccUSDC"}
    lrows = "".join(
        f"<tr><td>{i}</td><td><a href=\"/company/{escape(c)}/\">{escape(c.split('::')[1][:10])}…</a></td>"
        f"<td><a href=\"/company/{escape(c)}/siir/{escape(s)}\">#{escape(s)}</a></td>"
        f"<td><code>{escape(seller)}</code></td><td>{price} {escape(cur.get(cid, cid))}</td>"
        f"<td>{'open' if act else 'closed'}</td></tr>"
        for i, c, s, seller, price, cid, _t, act in zip(
            listings.get("ids", []), listings.get("company", []), listings.get("siirIds", []),
            listings.get("seller", []), listings.get("askPrice", []),
            listings.get("currencyId", []), listings.get("listedAt", []),
            listings.get("active", []))
    )
    brows = "".join(
        f"<tr><td>{i}</td><td><code>{escape(bidder)}</code></td>"
        f"<td><a href=\"/company/{escape(c)}/siir/{escape(s)}\">#{escape(s)}</a></td>"
        f"<td>{price} {escape(cur.get(cid, cid))}</td>"
        f"<td>{'spent' if acc else 'open'}</td></tr>"
        for i, bidder, c, s, price, cid, _v, acc in zip(
            bids.get("ids", []), bids.get("bidder", []), bids.get("company", []),
            bids.get("siirIds", []), bids.get("price", []), bids.get("currencyId", []),
            bids.get("validUntil", []), bids.get("accepted", []))
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR marketplace</title>
<style>body{{font-family:ui-sans-serif,system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 16px;color:#111}}
a{{color:#1d4ed8}} table{{border-collapse:collapse;width:100%;margin:10px 0}}
th,td{{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;font-size:14px}}
code{{font-size:12px}}</style></head><body>
<h1>SIIR marketplace</h1>
<p>custodial escrow exchange for SIIR deeds at <code>{escape(addr)}</code> —
state decoded from the marketplace contract.</p>
<p><strong>{n_list.get('count', '?')}</strong> listings · <strong>{n_bids.get('count', '?')}</strong> bids</p>
<h2>ask listings</h2>
<table><tr><th>id</th><th>company</th><th>deed</th><th>seller</th><th>ask</th><th>state</th></tr>{lrows or '<tr><td colspan=6>none</td></tr>'}</table>
<h2>buy offers</h2>
<table><tr><th>id</th><th>bidder</th><th>deed</th><th>price</th><th>state</th></tr>{brows or '<tr><td colspan=5>none</td></tr>'}</table>
<p><small>all values are read on-chain; nothing is cached by the gateway for longer than a few seconds.</small></p>
</body></html>"""
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
        rows = []
        for c in load_companies():
            addr = c.get("address", "")
            rows.append(
                f'<li><a href="/company/{addr}/">{escape(c.get("name") or addr)}</a> '
                f'<a href="/company/{addr}/explore">explore</a> '
                f'<small><code>{escape(addr)}</code></small></li>'
            )
        mkt = ""
        if factory:
            mkt = (run_getter(factory, "getMarketplaceAddress", abi=FACTORY_ABI) or {}).get("value0", "")
        mkt_link = f' · <a href="/marketplace/{escape(mkt)}/">marketplace</a>' if mkt else ""
        html = f"""<!doctype html><html><head><meta charset="utf-8"><title>SIIR gateway</title></head>
<body><h1>SIIR gateway — companies on shellnet</h1>
<p>directory reads the factory registry on-chain:
<code>{escape(factory) if factory else 'no factory in scripts/.work/factory.addr'}</code>
<a href="/factory/{escape(factory)}/">{'open directory' if factory else ''}</a>{mkt_link}</p>
<ul>{''.join(rows) if rows else '<li>none registered (factory unreachable or empty)</li>'}</ul>
<p><small>everything rendered here is read from the contracts on-chain.</small></p></body></html>"""
        return self._send(html.encode(), "text/html; charset=utf-8")

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
        if parts[:1] == ["company"] and len(parts) >= 2:
            addr = parts[1]
            if not re.fullmatch(r"[0-9a-f]{64}::[0-9a-f]{64}", addr):
                return self._send(b"bad address (want dapp_id::account_id)",
                                  "text/plain", 400)
            if parts[2:] == ["claim"]:
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
            if len(rest) > 2 and rest[2] == "deed":
                return self._send(deed_page(addr, rest[1]).encode(),
                                  "text/html; charset=utf-8")
            return self._send(siir_page(addr, rest[1]).encode(),
                              "text/html; charset=utf-8")
        if what == "claim":
            return self._send(claim_form_page(addr).encode(),
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
    global NET, DEBUG, WALLET_ABI
    ap = argparse.ArgumentParser(description="SIIR on-chain content gateway")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--net", default="shellnet.ackinacki.org")
    ap.add_argument("--multisig-abi",
                    help="path to UpdateCustodianMultisigWallet.abi.json "
                         "(defaults: repo/contracts/0.79.3_compiled/..., "
                         "/tmp/opencode/acki-research/ackinacki/...)")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    NET = args.net
    DEBUG = args.debug
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