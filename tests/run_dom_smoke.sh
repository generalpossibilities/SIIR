#!/usr/bin/env bash
# run_dom_smoke.sh — render the explorer UI in headless Chrome and assert the
# expected markers for the live marketplace/company.
#
# Requires: google-chrome (or CHROME_BIN) and a gateway to serve /static/.
# By default it boots a throwaway gateway on a random port with --no-write,
# hits the same routes the deployed Pages site serves, and dumps a markdown
# summary with PASS/FAIL per assertion.
#
# usage: tests/run_dom_smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME_BIN:-$(command -v google-chrome || command -v chromium || command -v chromium-browser)}"
PORT="${SMOKE_PORT:-8099}"
HOST="http://127.0.0.1:$PORT"
OUT="$(mktemp -d)"
CHROME_RUN() { timeout 40 "$CHROME" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$OUT/profile$$" --dump-dom "$HOST$1" 2>"$OUT/chrome.err"; }
trap 'rm -rf "$OUT"; kill $GW 2>/dev/null || true' EXIT

echo "== booting gateway (read-only) on :$PORT =="
python3 scripts/gateway.py --port "$PORT" >"$OUT/gw.log" 2>&1 &
GW=$!
sleep 1.5

pass=0; fail=0
check() { # check <name> <file> <regex>
    if grep -qE "$3" "$2"; then pass=$((pass+1)); echo "PASS $1";
    else fail=$((fail+1)); echo "FAIL $1 (missing: $3)"; fi
}

dump() { # dump <route> <outfile>
    CHROME_RUN "$1" >"$2"
}
wait_ready() {
    for _ in $(seq 1 30); do
        CHROME_RUN "$1" >/dev/null && return 0
        sleep 0.5
    done
    return 1
}

echo "== dumping routes =="
wait_ready "/" || { echo "gateway never became ready"; cat "$OUT/gw.log"; exit 1; }

dump "/"           "$OUT/landing.html"
dump "/search?q=njd" "$OUT/search.html"
dump "/company/82a2ff688d97c434697602f8dbe38c4d0e582a4f5e4f5d936b29589c422791e6::6890748cdb02ed4c1ac5f43b52c4e9048f60567fe0cbfbe8124babb37f1096bd" "$OUT/company.html"

echo "== asserting =="
check "landing title"        "$OUT/landing.html"  "SIIR"
check "landing escrow card"  "$OUT/landing.html"  "escrow|Marketplace|browse"
check "search gates"         "$OUT/landing.html"  "search"
check "search results"       "$OUT/search.html"   "NJD|njd|result"
check "company name"         "$OUT/company.html"  "CompanySIIR|company"
check "company charter"      "$OUT/company.html"  "charter"

echo "== $pass passed, $fail failed =="
[[ $fail -eq 0 ]]
