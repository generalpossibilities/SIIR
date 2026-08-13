#!/usr/bin/env bash
# SIIR shellnet demo " full lifecycle:
#   factory -> company -> issue -> holder -> transfer -> deposit (any ecc currency) -> claim
#
# Requires: sold, tvm-cli (v3+, extended dapp_id::account_id addresses).
#
# FORCE=1 discards the current deployment: fresh factory keys (new dapp-id),
# fresh companies, fresh marketplace — and bakes the new addresses into the
# UI bundle before deploying the companies.
#
# PLAN_COUNT=<n> (default 100) sets the genesis plan size of the demo company.
# PLAN_COUNT=10000000000 additionally runs the 10B-scale proof: one O(1)
# issue() for all 10B ids, derived getSIIR spot checks (1 / mid / last),
# getBalanceOf, and a single transferRange covering the whole register.
# PLANS_CONFIG=<path> replaces the hardcoded plans with plans derived from a
# weight-based config (scripts/plans.py): totalWeight + tiers {label,
# pct, weightPer} — SIIR counts are computed, never entered.
# DEMO_FOUNDER_RIGHTS=1 runs the v2.2.0 founder-rights demo on the rounds
# company: grant -> co-founder ratify -> single-admin check -> revoke -> dead key.
#
# Fuel model (v2.3.0): every wallet -> protocol call attaches SHELL (ecc 2);
# the contract converts exactly what it needs (its own gas + outbound value
# + forward fees) and refunds the excess. VMSHELL flag-16 funding happens
# ONLY at bootstrap (factory + wallets); all mid-run funding is SHELL-only.
# Founder-key ops (issue, ratify, grant/revoke, ...) are exempt and run on
# the company's deploy reserve, which the founder's deploy SHELL funded.
#
# Addressing model on Acki Nacki:
#   * self-rooted (deployed via external message) contracts live at <own>::<own>
#   * children deployed by a contract inherit the parent's dapp_id
#   * tvm-cli ABI address params use legacy "0:hex"; CLI --addr/account use extended
#   * legacy "0:hex" resolves to the self-rooted account <hex>::<hex> for all
#     senders, root dapp included — self-rooted wallets reach self-rooted
#     contracts via legacy addresses (verified live on shellnet, Aug 2026)
set -euo pipefail

NET=shellnet.ackinacki.org
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CT=$ROOT/contracts
WORK=$ROOT/scripts/.work
ACKI=/tmp/opencode/acki-research/ackinacki
GG=1111111111111111111111111111111111111111111111111111111111111111
GIVER_FULL="0000000000000000000000000000000000000000000000000000000000000000::$GG"
GIVER_ABI="$ACKI/contracts/giver/GiverV3.abi.json"
MULTISIG_ABI="$ACKI/contracts/0.79.3_compiled/updatecustodianmultisigwallet/UpdateCustodianMultisigWallet.abi.json"
MULTISIG_TVC="$ACKI/contracts/0.79.3_compiled/updatecustodianmultisigwallet/UpdateCustodianMultisigWallet.tvc"
mkdir -p "$WORK"

cli() { tvm-cli -j -u "$NET" "$@"; }

# self-rooted full address
self() { echo "$1::$1"; }
legacy() { echo "0:${1##*::}"; }

# bake key into a work-copy tvc and print the account_id
bake() { # bake <tvc-name> <keys> <abi>  -> prints account_id, writes <name>.tvc + <name>.addr
  cp "$CT/$1.tvc" "$WORK/$1.tvc"
  cli genaddr "$WORK/$1.tvc" --abi "$3" --setkey "$2" --save >/dev/null
  echo "$(cli genaddr "$WORK/$1.tvc" --abi "$3" --setkey "$2" 2>/dev/null \
    | grep -i raw | awk '{print $NF}' | head -1 | tr -d '",' | sed 's/^0://')"
}
save_baked() { # save_baked <file> <addr> ; deploy? no
  echo "$2" > "$WORK/$1.addr"
}

fund() { # fund <self-or-full> <shell_nano>  — bootstrap only: VMSHELL gas (flag16) + SHELL ecc (raw)
  echo "  funding $1 with $2 nano SHELL (VMSHELL gas + SHELL ecc)..."
  local gas=$(( $2 / 5 ))
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrencyWithFlag \
    "{\"dest\":\"$(legacy "$1")\",\"value\":3000000000,\"ecc\":{\"2\":$gas},\"flag\":16}" >/dev/null 2>&1 || true
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
    "{\"dest\":\"$(legacy "$1")\",\"value\":3000000000,\"ecc\":{\"2\":$2}}" >/dev/null 2>&1 || true
}

# Fuel constants (v2.3.0) — the contracts convert what they need and refund
# the excess, so these are generous upper bounds, not exact budgets.
F_OP=2000000000        # no-outbound ops: transfer, transferRange, voteDissolve, list, cancelBid
F_CLAIM=3000000000     # claim: own gas + 1 VMSHELL payout + fwd fee
F_DEPLOY=30000000000   # deployCompany A: 20 VMSHELL child reserve + bundle fwd fees + explorer register push
F_DEPLOY_B=28000000000 # deployCompany B (no UI bundle, same register push)
F_BID_ESCROW=9000000000 # per-bid settlement escrow (acceptBid gas + 2 payout hops + deed SHELL fuel)

fund_shell() { # fund_shell <fulladdr> <shell_nano> — mid-run refill, SHELL only (no flag16)
  echo "  SHELL refill $1 +$2..."
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
    "{\"dest\":\"$(legacy "$1")\",\"value\":3000000000,\"ecc\":{\"2\":$2}}" >/dev/null 2>&1 || true
}

shell_balance() { # shell_balance <fulladdr> — ecc currency 2 nano
  cli account "$1" 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(int(d.get("ecc_balance",{}).get("2",0) or 0))' 2>/dev/null || echo 0
}

topup_shell() { # topup_shell <fulladdr> <min_shell> <label> — gas + SHELL refill
  # Every wallet send attaches ~3e9 native value plus processing gas, so the
  # wallet's native balance drains alongside its SHELL; refill both.
  local b n
  b=$(shell_balance "$1")
  n=$(cli account "$1" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("balance",0))' 2>/dev/null || echo 0)
  if [ "${n:-0}" -lt 15000000000 ] || [ "${b:-0}" -lt "$2" ]; then
    echo "  $3 balance low (native ${n} < 15e9, SHELL ${b} < $2); refilling..."
    if [ "${n:-0}" -lt 15000000000 ]; then
      cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrencyWithFlag \
        "{\"dest\":\"$(legacy "$1")\",\"value\":3000000000,\"ecc\":{\"2\":$((20000000000 - ${n:-0}))},\"flag\":16}" >/dev/null 2>&1 || true
    fi
    if [ "${b:-0}" -lt "$2" ]; then
      fund_shell "$1" 30000000000
    fi
    sleep 3
  fi
}

wait_active() { # wait_active <fulladdr> <name> [timeout_s]
  local t=${3:-60}
  for i in $(seq 1 $((t / 2))); do
    st=$(cli account "$1" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["acc_type"])' 2>/dev/null || echo "")
    [ "$st" = "Active" ] && { echo "  [ok] $2 is active"; return 0; }
    sleep 2
  done
  echo "[fail] $2 not active after ${t}s"; exit 1
}

body() { # body <abi> <method> <json>
  cli body --abi "$1" "$2" "$3" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Message"])'
}

company_code() { tvm-cli -j decode stateinit --tvc "$CT/CompanySIIR.tvc" | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])'; }
marketplace_code() { tvm-cli -j decode stateinit --tvc "$CT/SIIRMarketplace.tvc" | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])'; }
explorer_code() { tvm-cli -j decode stateinit --tvc "$CT/SIIRExplorer.tvc" | python3 -c 'import json,sys; print(json.load(sys.stdin)["code"])'; }

# On-chain content: base64 data-URI strings supplied at CompanySIIR deployment.
# These round-trip through factory.deployCompany and are readable via getters.
img_uri() { # img_uri <svg-body> -> data:image/svg+xml;base64,...
  local svg="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\">$1</svg>"
  echo -n "data:image/svg+xml;base64,$(printf '%s' "$svg" | base64 -w0)"
}
LOGO_SVG=$(img_uri '<rect width="64" height="64" fill="#1d4ed8"/><text x="32" y="40" font-size="28" fill="#fff" text-anchor="middle">S</text>'
)
SIIRIMG_SVG=$(img_uri '<rect width="64" height="64" fill="#111827"/><text x="32" y="40" font-size="22" fill="#fbbf24" text-anchor="middle">SIIR</text>'
)
# Tier art (v2.4): small SVGs rendered inside the deed's seal window — one
# per issuance plan. Family template: rounded tile, ring, tier mark.
tier_svg() { # tier_svg <c1> <c2> <mark>
  img_uri '<rect width="100" height="100" rx="16" fill="#0b1220"/><rect x="6" y="6" width="88" height="88" rx="12" fill="none" stroke="'"$1"'" stroke-width="3"/><circle cx="50" cy="50" r="30" fill="none" stroke="'"$2"'" stroke-width="5" opacity=".9"/><path d="M50 33l5 11 12 2-9 8 3 12-11-6-11 6 3-12-9-8 12-2z" fill="'"$1"'"/><text x="50" y="97" font-size="9" fill="'"$2"'" text-anchor="middle" font-family="monospace">'"$3"'</text>'
}
TIER_GENESIS=$(tier_svg '#34d399' '#065f46' GENESIS)
TIER_BRONZE=$(tier_svg '#cd7f32' '#7c4a1e' BRONZE)
TIER_SILVER=$(tier_svg '#c0c0c0' '#5f6b76' SILVER)
TIER_GOLD=$(tier_svg '#ffd700' '#8a6d00' GOLD)
TIER_PLATINUM=$(tier_svg '#e5e4e2' '#6b7280' PLATINUM)

# ---- plans config (optional) ----
# PLANS_CONFIG=<path> derives the deployCompany plans array from a weight-based
# config (scripts/plans.py: totalWeight + tiers {label, pct, weightPer},
# counts derived). Without it the legacy PLAN_COUNT genesis plan is used.
GENESIS_PLANS="[{\"count\":${PLAN_COUNT:-100},\"weight\":1000,\"label\":\"Genesis\",\"issued\":false,\"image\":\"$TIER_GENESIS\"}]"
PLANS_JSON="${PLANS_JSON:-}"
if [ -n "${PLANS_CONFIG:-}" ]; then
  PLANS_JSON=$(python3 "$ROOT/scripts/plans.py" "$PLANS_CONFIG" --emit) || exit 1
  echo "  plans derived from $PLANS_CONFIG:"
  python3 "$ROOT/scripts/plans.py" "$PLANS_CONFIG" | sed 's/^/    /' || true
fi
[ -n "$PLANS_JSON" ] || PLANS_JSON="$GENESIS_PLANS"
UI_BUNDLE=$(python3 static/bundle.py --emit 2>/dev/null || python3 - <<'PY'
import base64
html = "<!doctype html><html><body><h1>NJD Ventures</h1><p>shareholder register on-chain</p></body></html>"
print("data:text/html;base64," + base64.b64encode(html.encode()).decode())
PY
)
CHARTER=$(python3 - <<'PY'
import json
charter = """NJD Ventures charter (immutable, on-chain, founder-bound).
1. The total supply of SIIRs is fixed at creation and grows only via the
   declared issuance plan. No silent minting, ever.
2. Dividends are paid in SHELL and belong to the SIIR: whoever holds the
   deed at claim time receives the pending value, cum-dividend.
3. Every SIIR transfer is recorded in the register's immutable history.
4. The founder commits to issuing no more than the declared plan, to
   depositing dividends within 30 days of a declared distribution, and to
   never altering the dividend accounting.
5. This charter is binding on the founder personally; the founder's
   on-chain ratification (ratifyCharter) confirms it under their key."""
print(json.dumps(charter))   # JSON-escaped string literal: use as "charter":$CHARTER
PY
)

deploy_self() { # deploy_self <work-tvc-name> <keys> <abi> <params-json> -> deploys self-rooted
  local name=$1 keys=$2 abi=$3 params=$4 R
  R=$(cli genaddr "$WORK/$name.tvc" --abi "$abi" --setkey "$keys" 2>/dev/null \
    | grep -i raw | awk '{print $NF}' | head -1 | tr -d '",' | sed 's/^0://')
  echo "$R" > "$WORK/$name.addr"
  if cli account "$(self "$R")" 2>/dev/null | grep -q '"Active"'; then return 0; fi
  for attempt in $(seq 1 8); do
    cli deploy --abi "$abi" --sign "$keys" --dst-dapp-id "$R" "$WORK/$name.tvc" "$params" >/dev/null 2>&1 || true
    sleep 3    cli account "$(self "$R")" 2>/dev/null | grep -q '"Active"' && return 0
    sleep 3
  done
  echo "[fail] deploy ${name} (${R}) not active after retries"; exit 1
}

# root-dapp deploy is NOT used: legacy routing resolves to the self-rooted
# account for every sender (root dapp included), so factories deploy
# self-rooted and their children inherit the same dapp_id.

run() { cli run "$1" "$2" "$3" --abi "$4" 2>&1; }

# does the deployed factory hold the current code cells (company + marketplace)?
factory_stale() {
  local local_cc stored_cc local_mc stored_mc local_ec stored_ec ver want
  local_cc=$(company_code)
  stored_cc=$(cli run "$1" getCompanyCode '{}' --abi "$CT/SIIRFactory.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"])' 2>/dev/null || echo "")
  local_mc=$(marketplace_code)
  stored_mc=$(cli run "$1" getMarketplaceCode '{}' --abi "$CT/SIIRFactory.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
  local_ec=$(explorer_code)
  stored_ec=$(cli run "$1" getExplorerCode '{}' --abi "$CT/SIIRFactory.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
  ver=$(cli run "$1" getFactoryInfo '{}' --abi "$CT/SIIRFactory.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("ver",""))' 2>/dev/null || echo "")
  want=$(grep -m1 'string constant version' "$CT/SIIRFactory.sol" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
  [ "$stored_cc" != "$local_cc" ] || [ "$stored_mc" != "$local_mc" ] || [ "$stored_ec" != "$local_ec" ] || [ "$ver" != "$want" ]
}

# ---------- 1. build ----------
echo "== 1. build =="
make -C "$CT" build >/dev/null

# ---------- 2. factory ----------
echo "== 2. factory =="
[ -f "$WORK/factory.keys.json" ] || cli genphrase --dump "$WORK/factory.keys.json" >/dev/null
FACTORY_RAW=$(bake SIIRFactory "$WORK/factory.keys.json" "$CT/SIIRFactory.abi.json"); save_baked factory "$FACTORY_RAW"
FACTORY=$(self "$FACTORY_RAW")
echo "  factory: $FACTORY"
if ! cli account "$FACTORY" 2>/dev/null | grep -q '"Active"' || factory_stale "$FACTORY" || [ "${FORCE:-0}" = "1" ]; then
  if factory_stale "$FACTORY" || [ "${FORCE:-0}" = "1" ]; then
    echo "  factory holds stale code/version or FORCE=1; redeploying (fresh keys)..."
    cli genphrase --dump "$WORK/factory.keys.json" >/dev/null
    FACTORY_RAW=$(bake SIIRFactory "$WORK/factory.keys.json" "$CT/SIIRFactory.abi.json"); save_baked factory "$FACTORY_RAW"
    FACTORY=$(self "$FACTORY_RAW")
  fi
  fund "$FACTORY" 100000000000
  sleep 5
  echo "  deploying factory (with marketplace + explorer code)..."
  deploy_self SIIRFactory "$WORK/factory.keys.json" "$CT/SIIRFactory.abi.json" \
    "{\"value\":30000000000,\"companyCode\":\"$(company_code)\",\"marketplaceCode\":\"$(marketplace_code)\",\"explorerCode\":\"$(explorer_code)\"}"
  wait_active "$FACTORY" "factory"
fi
cli run "$FACTORY" getFactoryInfo {} --abi "$CT/SIIRFactory.abi.json"
MARKET_RAW=$(cli run "$FACTORY" getMarketplaceAddress '{}' --abi "$CT/SIIRFactory.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"].split(":")[1])' 2>/dev/null || echo "")
MARKET=$(self "$MARKET_RAW")   # marketplace is factory's child: same dapp-id
echo "  marketplace: $MARKET"
EXPLORER_RAW=$(cli run "$FACTORY" getExplorerAddress '{}' --abi "$CT/SIIRFactory.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"].split(":")[1])' 2>/dev/null || echo "")
EXPLORER=$(self "$EXPLORER_RAW")
echo "  explorer: $EXPLORER"
echo "$EXPLORER" > "$WORK/explorer.addr"
# v2.3.0: no reserve topup — every op converts its fuel from the caller's
# attached SHELL, and acceptBid runs on the bidder's escrow.
if ! cli account "$MARKET" 2>/dev/null | grep -q '"Active"'; then
  sleep 3
fi
cli account "$MARKET" 2>/dev/null | grep -q '"Active"' || echo "  [warn] marketplace not active yet"

# ---------- 3. founder wallet (self-rooted multisig) ----------
echo "== 3. founder wallet =="
[ -f "$WORK/company.keys.json" ] || cli genphrase --dump "$WORK/company.keys.json" >/dev/null
FOUNDER_PUB=$(python3 -c 'import json; print(json.load(open("'$WORK'/company.keys.json"))["public"])')
cp "$MULTISIG_TVC" "$WORK/founder.tvc"
cli genaddr "$WORK/founder.tvc" --abi "$MULTISIG_ABI" --setkey "$WORK/company.keys.json" --save >/dev/null
FOUNDER_RAW=$(cli genaddr "$WORK/founder.tvc" --abi "$MULTISIG_ABI" --setkey "$WORK/company.keys.json" 2>/dev/null \
  | grep -i raw | awk '{print $NF}' | head -1 | tr -d '",' | sed 's/^0://')
FOUNDER=$(self "$FOUNDER_RAW")
echo "  founder wallet: $FOUNDER"
if ! cli account "$FOUNDER" 2>/dev/null | grep -q '"Active"'; then
  # bootstrap: one-time generous VMSHELL gas (covers all demo sends) + SHELL
  # for fuel/dividends; mid-run refills are SHELL-only (fund_shell)
  fund "$FOUNDER" 250000000000
  sleep 3
  deploy_self founder "$WORK/company.keys.json" "$MULTISIG_ABI" \
    "{\"owners_pubkey\":[\"0x$FOUNDER_PUB\"],\"owners_address\":[],\"reqConfirms\":1,\"reqConfirmsData\":1,\"value\":3000000000}"
  wait_active "$FOUNDER" "founder wallet"
fi

# ---------- 4. company ----------
echo "== 4. company =="
COMPANY_RAW=$(cli run "$FACTORY" getCompanyAddress \
  "{\"founder\":\"$(legacy "$FOUNDER")\",\"founderPubkey\":\"0x$FOUNDER_PUB\"}" --abi "$CT/SIIRFactory.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"].split(":")[1])')
COMPANY=$(self "$COMPANY_RAW")
echo "  company (in factory dapp): $COMPANY"
# bake the live addresses into the UI bundle so the on-chain explorer opens
# its own factory directory and demo company (bundle is rebuilt only here:
# the addresses are only known once the factory is deployed above)
UI_BUNDLE=$(python3 "$ROOT/static/bundle.py" --set "FACTORY_ADDR=$FACTORY" --set "DEMO_ADDR=$COMPANY" --emit)
UI_MODE=plain
if [ "$(echo -n "$UI_BUNDLE" | wc -c)" -gt 46000 ]; then
  echo "  bundle over the 46k message budget; storing gzip-compressed..."
  UI_BUNDLE=$(python3 "$ROOT/static/bundle.py" --set "FACTORY_ADDR=$FACTORY" --set "DEMO_ADDR=$COMPANY" --emit --gzip)
  UI_MODE=gzip
fi
echo "  ui bundle: $(echo -n "$UI_BUNDLE" | wc -c) bytes base64 ($UI_MODE)"
if ! cli account "$COMPANY" 2>/dev/null | grep -q '"Active"'; then
  echo "  deploying company via factory (founder wallet pays SHELL fuel)..."
  # v2.3.0: the founder wallet calls deployCompany as an internal message
  # attaching SHELL; the factory converts exactly the child reserve + its own
  # gas + forward fees and refunds the excess back to the wallet
  topup_shell "$FOUNDER" 40000000000 "founder"
  C_DEPS=0
  while [ "$C_DEPS" -lt 3 ]; do
    cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
      "{\"dest\":\"$(legacy "$FACTORY")\",\"value\":3000000000,\"cc\":{\"2\":$F_DEPLOY},\"bounce\":true,\"flags\":1,\
        \"payload\":\"$(body "$CT/SIIRFactory.abi.json" deployCompany \
        "{\"name\":\"NJD Ventures\",\"description\":\"SIIR demo company\",\"website\":\"https://njd.example\",\
          \"metadataUri\":\"ipfs://QmSIIRdemo\",\"founder\":\"$(legacy "$FOUNDER")\",\"founderPubkey\":\"0x$FOUNDER_PUB\",\
          \"issuanceModel\":0,\"plans\":$PLANS_JSON,\
          \"logoImage\":\"$LOGO_SVG\",\"siirImage\":\"$SIIRIMG_SVG\",\"ui\":\"$UI_BUNDLE\",\
          \"charter\":$CHARTER,\"initialValue\":20000000000,\
          \"governanceEnabled\":${GOV_ENABLED:-false},\"quorumPermille\":${GOV_QUORUM:-500},\
          \"dissolutionRule\":${DISSOLUTION_RULE:-0},\"dissolutionDest\":\"$(legacy "$FOUNDER")\"}")\"}" >/dev/null 2>&1
    wait_active "$COMPANY" "company" 30
    cli account "$COMPANY" 2>/dev/null | grep -q '"Active"' && break
    echo "  [warn] deploy attempt $((C_DEPS+1)) did not land; retrying..."
    C_DEPS=$((C_DEPS+1))
    sleep 5
  done
fi
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"
echo "  governance/dissolution config:"
python3 scripts/gov_state.py "$COMPANY" || true

# ---------- 5. issue genesis ----------
echo "== 5. issue genesis =="
ISSUED=""
for attempt in $(seq 1 8); do
  ISSUED=$(cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("issuedCount","x"))' 2>/dev/null || echo x)
  [ "$ISSUED" != "x" ] && break
  sleep 2
done
if [ "$ISSUED" = "0" ]; then
  for attempt in $(seq 1 6); do
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m issue '{}' >/dev/null 2>&1 || true
    sleep 4
    ISSUED=$(cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["issuedCount"])' 2>/dev/null || echo 0)
    [ "$ISSUED" != "0" ] && break
  done
fi
[ "$ISSUED" != "0" ] || { echo "[fail] issue() never landed"; exit 1; }
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"

# ---------- 6. holder wallet ----------
echo "== 6. holder wallet =="
[ -f "$WORK/holder.keys.json" ] || cli genphrase --dump "$WORK/holder.keys.json" >/dev/null
HOLDER_PUB=$(python3 -c 'import json; print(json.load(open("'$WORK'/holder.keys.json"))["public"])')
cp "$MULTISIG_TVC" "$WORK/holder.tvc"
cli genaddr "$WORK/holder.tvc" --abi "$MULTISIG_ABI" --setkey "$WORK/holder.keys.json" --save >/dev/null
HOLDER_RAW=$(cli genaddr "$WORK/holder.tvc" --abi "$MULTISIG_ABI" --setkey "$WORK/holder.keys.json" 2>/dev/null \
  | grep -i raw | awk '{print $NF}' | head -1 | tr -d '",' | sed 's/^0://')
HOLDER=$(self "$HOLDER_RAW")
echo "  holder wallet: $HOLDER"
if ! cli account "$HOLDER" 2>/dev/null | grep -q '"Active"'; then
  fund "$HOLDER" 250000000000
  sleep 3
  deploy_self holder "$WORK/holder.keys.json" "$MULTISIG_ABI" \
    "{\"owners_pubkey\":[\"0x$HOLDER_PUB\"],\"owners_address\":[],\"reqConfirms\":1,\"reqConfirmsData\":1,\"value\":3000000000}"
  wait_active "$HOLDER" "holder wallet"
fi

# ---------- 5b. 10B-scale proof (PLAN_COUNT=10^10) ----------
if [ "${PLAN_COUNT:-100}" = "10000000000" ]; then
  echo "== 5b. 10B-scale proof (lazy derived registry) =="
  topup_shell "$FOUNDER" 20000000000 "founder"
  cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"
  echo "  spot-check derived getSIIR at 1 / mid / last:"
  cli run "$COMPANY" getSIIR '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
  cli run "$COMPANY" getSIIR '{"id":"5000000000"}' --abi "$CT/CompanySIIR.abi.json" || true
  cli run "$COMPANY" getSIIR '{"id":"10000000000"}' --abi "$CT/CompanySIIR.abi.json" || true
  echo "  register shape (compact ranges, not per-id rows):"
  cli run "$COMPANY" getSegments '{}' --abi "$CT/CompanySIIR.abi.json" || true
  FB10=$(cli run "$COMPANY" getBalanceOf "{\"owner\":\"$(legacy "$FOUNDER")\"}" --abi "$CT/CompanySIIR.abi.json" \
    | python3 -c 'import json,sys; print(int(json.load(sys.stdin).get("count",0) or 0, 16))' 2>/dev/null || echo "?")
  echo "  founder balance: $FB10 (expect 10000000000)"
  [ "$FB10" = "10000000000" ] && echo "  [ok] balance counts derived ids from one segment" || echo "  [fail] balance mismatch"
  echo "  one transferRange moves all 10B ids to the holder:"
  topup_shell "$FOUNDER" 20000000000 "founder"
  cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" transferRange '{"start":"1","end":"10000000000","newOwner":"'$(legacy "$HOLDER")'"}')\"}" >/dev/null || true
  for attempt in $(seq 1 15); do
    H10=$(cli run "$COMPANY" getOwnerOf '{"id":"5000000000"}' --abi "$CT/CompanySIIR.abi.json" \
      | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
    [ "$H10" = "0:$HOLDER_RAW" ] && break
    sleep 2
  done
  echo "  SIIR #5000000000 owner: ${H10:-?} (expect 0:$HOLDER_RAW)"
  [ "$H10" = "0:$HOLDER_RAW" ] && echo "  [ok] transferRange landed in one record" || echo "  [fail] transferRange never landed"
  cli run "$COMPANY" getSegments '{}' --abi "$CT/CompanySIIR.abi.json" || true
  cli run "$COMPANY" getHistory '{"id":"10000000000"}' --abi "$CT/CompanySIIR.abi.json" || true
fi

# ---------- 7. transfer SIIR #1 -> holder ----------
echo "== 7. transfer SIIR #1 to holder =="
OWNER=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
echo "  SIIR #1 owner: $OWNER"
if [ "$OWNER" != "0:$FOUNDER_RAW" ]; then
  echo "  owner is not founder wallet; skipping transfer"
else
  topup_shell "$FOUNDER" 20000000000 "founder"
  cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" transfer "{\"ids\":[\"1\"],\"newOwner\":\"$(legacy "$HOLDER")\"}")\"}" >/dev/null || true
  for attempt in $(seq 1 15); do
    O1=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
      | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
    [ "$O1" = "0:$HOLDER_RAW" ] && break
    sleep 2
  done
  echo "  SIIR #1 owner after transfer: ${O1:-?} (expect 0:$HOLDER_RAW)"
  [ "$O1" = "0:$HOLDER_RAW" ] && echo "  [ok] transfer landed: SIIR #1 -> holder" || { echo "  [fail] transfer never landed"; exit 1; }
  cli run "$COMPANY" getSIIR '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"
fi

# ---------- 8. deposit dividends (5,000 eccUSDC + 1 NACKL; SHELL = fuel only) ----------
echo "== 8. deposit 5000 eccUSDC + 1 NACKL dividends (SHELL is fuel, never a dividend) =="
# the founder wallet must actually hold every attached currency (ecc 2, 3, 1)
topup_shell "$FOUNDER" 30000000000 "founder"
# the founder wallet must actually hold every attached currency (ecc 2, 3, 1);
# the giver throttles, so confirm each currency landed before the deposit
for CUR in 3:5000000000000 2:20000000000 1:1000000000; do
  CURID=${CUR%%:*}; NEED=${CUR##*:}
  HAVE=$(cli account "$FOUNDER" 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ecc_balance",{}).get("'$CURID'",0))' 2>/dev/null || echo 0)
  TRY=0
  while [ "${HAVE:-0}" -lt "$NEED" ] && [ "$TRY" -lt 5 ]; do
    cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
      "{\"dest\":\"$(legacy "$FOUNDER")\",\"value\":3000000000,\"ecc\":{\"$CURID\":$NEED}}" >/dev/null 2>&1 || true
    sleep 4
    HAVE=$(cli account "$FOUNDER" 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ecc_balance",{}).get("'$CURID'",0))' 2>/dev/null || echo 0)
    TRY=$((TRY+1))
  done
  [ "${HAVE:-0}" -ge "$NEED" ] || { echo "  [fail] founder ecc $CURID still ${HAVE} < $NEED (giver throttled)"; exit 1; }
done
sleep 3
div_dep() { cli run "$COMPANY" getDividendCurrencies {} --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); ids=d.get('ids') or d.get('value0') or []; deps=d.get('deposits') or d.get('value2') or []; print(deps[ids.index('$1')] if '$1' in ids else 0)" 2>/dev/null || echo 0; }
PRE_USDC=$(div_dep 3)
# v2.5.0: SHELL is fuel only — never a dividend. The attached SHELL pays the
# entry's gas (a small slice is converted, the rest refunded); dividends are
# declared in eccUSDC (3) + NACKL (1). The +F_OP margin guarantees the fuel
# slice never eats into anything.
cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP,\"3\":5000000000000,\"1\":1000000000},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" depositDividends '{"currencyIds":["3","1"]}')\"}" >/dev/null || true
for attempt in $(seq 1 15); do
  NOW_USDC=$(div_dep 3)
  [ "$NOW_USDC" != "$PRE_USDC" ] && break
  sleep 2
done
[ "$NOW_USDC" = "$PRE_USDC" ] && { echo "  [fail] deposit never landed (pre=$PRE_USDC post=$NOW_USDC)"; exit 1; }
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getDividendCurrencies {} --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"

# ---------- 9. claim ----------
echo "== 9. holder claims (eccUSDC + NACKL in one transfer; SHELL is fuel only) =="
# v2.3.0 claimer-pays: the attached SHELL funds the payout envelope; the
# claim never drains the company reserve. VMSHELL comes from bootstrap.
topup_shell "$HOLDER" 20000000000 "holder"
cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_CLAIM},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" claim '{"ids":["1"]}')\"}" >/dev/null || true
for attempt in $(seq 1 15); do
  OUT=$(cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" 2>/dev/null || true)
  LEFT=$(echo "$OUT" | python3 -c 'import json,sys; a=json.load(sys.stdin).get("amounts") or []; print(sum(int(x) for x in a))' 2>/dev/null || echo x)
  [ "$LEFT" = "0" ] && break
  sleep 2
done
[ "$LEFT" = "0" ] || { echo "  [fail] claim never settled (pending=$LEFT)"; exit 1; }
echo "  after claim:"
cli run "$COMPANY" getSIIR '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
cli run "$COMPANY" getHistory '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
cli account "$HOLDER" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  holder ecc:", d.get("ecc_balance"), "vmshell:", d.get("balance"))' || true

# ---------- 10. MODEL_ROUNDS: second company, incremental rounds ----------
echo "== 10. model-B company (rounds) =="
# second company: founder = the holder wallet (distinct statics => distinct address)
B_FOUNDER_PUB=$(python3 -c 'import json; print(json.load(open("'$WORK'/holder.keys.json"))["public"])')
B_RAW=$(cli run "$FACTORY" getCompanyAddress \
  "{\"founder\":\"$(legacy "$HOLDER")\",\"founderPubkey\":\"0x$B_FOUNDER_PUB\"}" --abi "$CT/SIIRFactory.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"].split(":")[1])')
COMPANY_B=$(self "$B_RAW")
echo "  rounds company: $COMPANY_B"
if ! cli account "$COMPANY_B" 2>/dev/null | grep -q '"Active"'; then
  echo "  deploying rounds company via factory (holder wallet pays SHELL fuel)..."
  # v2.3.0: founder wallet (here: the holder) funds the deploy; the factory
  # no longer spends its own reserve on company deploys, so no refill needed
  topup_shell "$HOLDER" 40000000000 "holder"
  B_DEPS=0
  while [ "$B_DEPS" -lt 3 ]; do
    cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
      "{\"dest\":\"$(legacy "$FACTORY")\",\"value\":3000000000,\"cc\":{\"2\":$F_DEPLOY_B},\"bounce\":true,\"flags\":1,\
        \"payload\":\"$(body "$CT/SIIRFactory.abi.json" deployCompany \
        "{\"name\":\"Rounds Inc\",\"description\":\"model-B company\",\"website\":\"\",\"metadataUri\":\"\",\
          \"founder\":\"$(legacy "$HOLDER")\",\"founderPubkey\":\"0x$B_FOUNDER_PUB\",\"issuanceModel\":1,\
          \"plans\":$PLANS_JSON,\
          \"logoImage\":\"$LOGO_SVG\",\"siirImage\":\"$SIIRIMG_SVG\",\"ui\":\"\",\
          \"charter\":$CHARTER,\"initialValue\":20000000000,\
          \"governanceEnabled\":${GOV_ENABLED:-false},\"quorumPermille\":${GOV_QUORUM:-500},\
          \"dissolutionRule\":${DISSOLUTION_RULE:-0},\"dissolutionDest\":\"$(legacy "$HOLDER")\"}")\"}" >/dev/null 2>&1
    wait_active "$COMPANY_B" "rounds company" 30
    cli account "$COMPANY_B" 2>/dev/null | grep -q '"Active"' && break
    echo "  [warn] rounds deploy attempt $((B_DEPS+1)) did not land; retrying..."
    B_DEPS=$((B_DEPS+1))
    sleep 5
  done
  cli account "$COMPANY_B" 2>/dev/null | grep -q '"Active"' || { echo "  [fail] rounds company not active after retries"; exit 1; }
fi
run_info_b() { cli run "$COMPANY_B" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("    issuedCount=%s totalWeight=%s model=%s"%(d.get("issuedCount","?"),d.get("totalWeight","?"),d.get("issuanceModel","?")))' 2>/dev/null || true; }
b_count() { cli run "$COMPANY_B" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("issuedCount","0"))' 2>/dev/null | tail -1; }
issue_until() { # issue_until <keys-file> <target-count> — founder = holder
  local keys=$1 target=$2 n
  n=$(b_count)
  for attempt in $(seq 1 10); do
    [ "${n:-0}" -ge "$target" ] 2>/dev/null && return 0
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$keys" -m issue '{}' >/dev/null 2>&1 || true
    sleep 4
    n=$(b_count)
  done
  echo "[fail] issue stopped at ${n:-?} (wanted $target)"; exit 1
}
echo "  issuing bronze..."
issue_until "$WORK/holder.keys.json" 25 && run_info_b
echo "  issuing silver..."
issue_until "$WORK/holder.keys.json" 50 && run_info_b
echo "  issuing gold..."
issue_until "$WORK/holder.keys.json" 75 && run_info_b
echo "  issuing platinum..."
issue_until "$WORK/holder.keys.json" 100 && run_info_b
echo "  extra issue (expect supply-exceeded rejection):"
for attempt in $(seq 1 8); do
  OUT=$(cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$WORK/holder.keys.json" -m issue '{}' 2>&1 || true)
  EC=$(echo "$OUT" | python3 -c 'import json,sys,re; t=sys.stdin.read(); m=re.search(r"\"exit_code\":\s*(-?\d+)", t); print(m.group(1) if m else "0")')
  [ "$EC" != "0" ] && { echo "  exit_code: $EC"; break; }
  sleep 4
done
cli run "$COMPANY_B" getPlans {} --abi "$CT/CompanySIIR.abi.json"

# ---------- 13c. founder rights (v2.2.0): grant -> power -> single-admin -> revoke ----------
# On the rounds company (founder = holder wallet, charter never ratified):
# the original founder grants the main-founder key co-founder rights, the
# co-founder proves founder power (ratifyCharter), proves single-admin
# (co-founder grant attempt is rejected), then revocation kills the rights.
if [ "${DEMO_FOUNDER_RIGHTS:-0}" = "1" ]; then
  echo "== 13c. founder rights v2.2.0 =="
  CF_KEYS="$WORK/company.keys.json"
  CF_PUBKEY=$(python3 -c 'import json; print("0x"+json.load(open("'"$CF_KEYS"'"))["public"])')
  CF_WALLET="0:$FOUNDER_RAW"
  FR() { python3 scripts/gov_state.py "$COMPANY_B" founders 2>/dev/null \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); c=d.get("coFounders") or []; print(len(c), c[0]["wallet"] if c else "-", c[0]["pubkey"][:18] if c else "-")' 2>/dev/null || echo "? ?"; }
  echo "  before grant: $(FR) (expect 0 -)"
  # 13c-1. original founder (holder) grants the main founder wallet + its key
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$WORK/holder.keys.json" -m grantFounderRights \
    "{\"wallet\":\"$CF_WALLET\",\"pubkey\":\"$CF_PUBKEY\"}" >/dev/null 2>&1 || true
  sleep 4
  G=$(FR)
  [ "${G%% *}" = "1" ] && echo "  [ok] grant landed: $G" || echo "  [fail] grant never landed ($G)"
  # 13c-2. the co-founder exercises founder power: ratify the charter
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$CF_KEYS" -m ratifyCharter '{}' >/dev/null 2>&1 || true
  sleep 4
  RAT=$(cli run "$COMPANY_B" getCharter {} --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
    | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("ratified","?")).lower())' 2>/dev/null || echo "?")
  [ "$RAT" = "true" ] && echo "  [ok] co-founder ratified the charter (founder power proven)" || echo "  [fail] co-founder ratify rejected (ratified=$RAT)"
  # 13c-3. single-admin: the co-founder cannot grant further rights
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$CF_KEYS" -m grantFounderRights \
    "{\"wallet\":\"0:$HOLDER_RAW\",\"pubkey\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"}" >/dev/null 2>&1 || true
  sleep 4
  G2=$(FR)
  [ "${G2%% *}" = "1" ] && echo "  [ok] co-founder grant rejected (single-admin, still ${G2%% *} founder)" || echo "  [fail] co-founder granted more rights ($G2)"
  # 13c-4. original founder revokes by wallet
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$WORK/holder.keys.json" -m revokeFounderRights \
    "{\"wallet\":\"$CF_WALLET\",\"pubkey\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"}" >/dev/null 2>&1 || true
  sleep 4
  G3=$(FR)
  [ "${G3%% *}" = "0" ] && echo "  [ok] revoke landed: 0 co-founders" || echo "  [fail] revoke never landed ($G3)"
  # 13c-5. the revoked key holds no power: its grant attempt must not land
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$CF_KEYS" -m grantFounderRights \
    "{\"wallet\":\"0:$HOLDER_RAW\",\"pubkey\":\"$CF_PUBKEY\"}" >/dev/null 2>&1 || true
  sleep 4
  G4=$(FR)
  [ "${G4%% *}" = "0" ] && echo "  [ok] revoked key rejected (rights are dead)" || echo "  [fail] revoked key still grants ($G4)"
  FR
fi

# ---------- 11. on-chain content: round-trip + size-cap enforcement ----------
echo "== 11. on-chain content =="
ct_get() { cli run "$1" "$2" '{}' --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$3', d.get('value0','')))"; }
SZ_LOGO=$(ct_get "$COMPANY" getContentInfo logoSize); SZ_SIIR=$(ct_get "$COMPANY" getContentInfo siirImageSize); SZ_UI=$(ct_get "$COMPANY" getContentInfo uiSize)
echo "  content sizes: logo=$SZ_LOGO siirImage=$SZ_SIIR ui=$SZ_UI (bytes)"
R_LOGO=$(ct_get "$COMPANY" getCompanyImage img); R_SIIR=$(ct_get "$COMPANY" getSIIRImage img); R_UI=$(ct_get "$COMPANY" getUI ui)
[ "$R_LOGO" = "$LOGO_SVG" ] && echo "  [ok] company logo round-trips on-chain" || echo "  [fail] logo mismatch"
[ "$R_SIIR" = "$SIIRIMG_SVG" ] && echo "  [ok] SIIR deed image round-trips on-chain" || echo "  [fail] siir image mismatch"
ui_norm() { python3 -c '
import sys, base64, gzip
s = sys.stdin.read().strip()
m = "data:text/html;base64,"
gz = s.startswith(m + "gz,")
b = s[len(m) + (3 if gz else 0):]
d = base64.b64decode(b)
print(gzip.decompress(d).decode(errors="replace") if gz else d.decode(errors="replace"))'; }
if [ "$(printf '%s' "$R_UI" | ui_norm)" = "$(printf '%s' "$UI_BUNDLE" | ui_norm)" ]; then
  echo "  [ok] static UI bundle round-trips on-chain"
else
  echo "  [fail] ui mismatch"
fi
echo "  oversized uploads: capped at deploy by require() in the factory"
echo "    (factory ERR_LOGO/SIIR/UI/CHARTER_TOO_LARGE 202-205, company 108-111)."
echo "    Note: tvm-cli's own message builder refuses >~128KB/single-message,"
echo "    so the cap is guaranteed server-side but not triggerable via this CLI."

# ---------- 12. charter: immutable commitment + founder ratification ----------
echo "== 12. charter =="
R_CHAR=$(ct_get "$COMPANY" getCharter charter)
R_RAT=$(ct_get "$COMPANY" getCharter ratified | tr '[:upper:]' '[:lower:]')
FP=$(ct_get "$COMPANY" getCharterFingerprint fp)
CHARTER_RAW=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1]))' "$CHARTER")
[ "$R_CHAR" = "$CHARTER_RAW" ] && echo "  [ok] charter round-trips on-chain (immutable text)" || echo "  [fail] charter mismatch"
echo "  [ok] ratified=$R_RAT  fingerprint=$FP"
if [ "$R_RAT" != "true" ]; then
  for attempt in $(seq 1 6); do
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m ratifyCharter '{}' >/dev/null 2>&1 || true
    sleep 4
    R_RAT=$(ct_get "$COMPANY" getCharter ratified | tr '[:upper:]' '[:lower:]')
    [ "$R_RAT" = "true" ] && break
  done
  [ "$R_RAT" = "true" ] || { echo "  [fail] ratifyCharter never landed"; exit 1; }
  R_CHAR=$(ct_get "$COMPANY" getCharter charter)
  FP2=$(ct_get "$COMPANY" getCharterFingerprint fp)
  echo "  after founder ratification: ratified=$R_RAT"
  [ "$R_CHAR" = "$CHARTER_RAW" ] && echo "  [ok] charter text unchanged after ratification" || echo "  [fail] charter changed!"
  [ "$FP" = "$FP2" ] && echo "  [ok] charter fingerprint stable ($FP)" || echo "  [fail] fingerprint changed!"
  echo "  second ratification (expect ERR_ALREADY_RATIFIED exit 112):"
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m ratifyCharter '{}' 2>&1 \
    | python3 -c 'import json,sys,re; t=sys.stdin.read(); m=re.search(r"\"exit_code\":\s*(-?\d+)", t); print("  exit_code:", m.group(1) if m else ("none:", t[:160]))' || true
else
  echo "  (already ratified on a previous run)"
fi

# ---------- 13. marketplace: escrow listing -> bid -> accept ----------
echo "== 13. marketplace =="
echo "  marketplace: $MARKET"
# 13a. seller (holder) escrows SIIR #1 into the marketplace (it owns it after step 7)
# v2.3.0: wallet sends attach SHELL fuel; VMSHELL comes from bootstrap
topup_shell "$HOLDER" 30000000000 "holder"
OWNER1=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
echo "  SIIR #1 owner: $OWNER1 (seller escrows it)"
if [ "$OWNER1" = "0:$HOLDER_RAW" ]; then
  cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" transfer "{\"ids\":[\"1\"],\"newOwner\":\"$(legacy "$MARKET")\"}")\"}" >/dev/null || true
  sleep 4
fi
echo "  SIIR #1 owner after escrow:"
cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
# 13b. seller lists it for 5 SHELL
cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$MARKET")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/SIIRMarketplace.abi.json" list "{\"company\":\"$(legacy "$COMPANY")\",\"ids\":[\"1\"],\"askPrice\":5000000000,\"currencyId\":2}")\"}" >/dev/null || true
sleep 4
echo "  listings:"
cli run "$MARKET" getListings '{"offset":0,"limit":10}' --abi "$CT/SIIRMarketplace.abi.json" || true
# 13c. buyer (founder) bids 5 SHELL + settlement escrow, valid 1 hour
# (v2.3.0: the escrow pays acceptBid's gas + both payout hops, bidder-funded)
topup_shell "$FOUNDER" 30000000000 "founder"
cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$MARKET")\",\"value\":3000000000,\"cc\":{\"2\":$((5000000000 + F_BID_ESCROW))},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/SIIRMarketplace.abi.json" bid "{\"company\":\"$(legacy "$COMPANY")\",\"ids\":[\"1\"],\"price\":5000000000,\"currencyId\":2,\"validUntil\":$(( $(date +%s) + 3600 ))}")\"}" >/dev/null || true
sleep 4
echo "  bids:"
cli run "$MARKET" getBids '{"offset":0,"limit":10}' --abi "$CT/SIIRMarketplace.abi.json" || true
# 13d. seller accepts the top bid — settlement fuel comes from the bidder's
# escrow (the seller attaches no SHELL here)
cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$MARKET")\",\"value\":3000000000,\"cc\":{},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/SIIRMarketplace.abi.json" acceptBid '{"listingId":1,"bidId":1}')\"}" >/dev/null || true
sleep 4
echo "  after settlement — SIIR #1 owner:"
cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" || true
echo "  listing state:"
cli run "$MARKET" getListing '{"listingId":1}' --abi "$CT/SIIRMarketplace.abi.json" || true
# 13e. verify the settlement landed: deed with the bidder, listing closed
O1=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
ACT=$(cli run "$MARKET" getListing '{"listingId":1}' --abi "$CT/SIIRMarketplace.abi.json" | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("active","?")).lower())' 2>/dev/null || echo "?")
if [ "$O1" = "0:$FOUNDER_RAW" ] && [ "$ACT" = "false" ]; then
  echo "  [ok] acceptBid settled: deed -> bidder, listing closed"
else
  echo "  [fail] acceptBid did not settle (owner=$O1 active=$ACT)"
  exit 1
fi

echo ""
if [ "${DEMO_DISSOLUTION:-0}" = "1" ]; then
  # ---------- 14. dissolution lifecycle demo (freezes the demo company) ----------
  echo "== 14. dissolution lifecycle =="
  GOV() { python3 scripts/gov_state.py "$COMPANY" 2>/dev/null || echo "{}"; }
  GOV_FMT() { GOV | python3 -c 'import json,sys; d=json.load(sys.stdin); print("governanceEnabled=%s quorum=%s votes=%s dissolved=%s rule=%s finalDeposited=%s finalized=%s" % (d.get("_governanceEnabled"), d.get("_quorumPermille"), d.get("_dissolveVotes"), d.get("_dissolved"), d.get("_dissolutionRule"), d.get("_finalDeposited"), d.get("_finalized")))' 2>/dev/null || echo "?"; }
  echo "  before: $(GOV_FMT)"
  # 14a. register is frozen: a transfer from the current owner must not land
  O2=$(cli run "$COMPANY" getOwnerOf '{"id":"2"}' --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "?")
  if [ "$O2" = "0:$FOUNDER_RAW" ]; then S2_KEYS="$WORK/company.keys.json"; S2_WHO="founder";
  elif [ "$O2" = "0:$HOLDER_RAW" ]; then S2_KEYS="$WORK/holder.keys.json"; S2_WHO="holder";
  else S2_KEYS=""; S2_WHO="?"; fi
  [ -n "$S2_KEYS" ] && cli callx --abi "$MULTISIG_ABI" --addr "$O2" --keys "$S2_KEYS" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" transfer '{"ids":["2"],"newOwner":"'$(legacy "$MARKET")'"}')\"}" >/dev/null || true
  sleep 3
  O2B=$(cli run "$COMPANY" getOwnerOf '{"id":"2"}' --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "?")
  [ "$O2B" = "$O2" ] && echo "  [ok] register frozen before dissolution: transfer rejected (owner of #2 unchanged)" \
    || echo "  [fail] transfer landed before dissolution (owner was $O2 now $O2B)"
  # 14b. governance-disabled vote is rejected (attaches SHELL fuel anyway)
  cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" voteDissolve '{}')\"}" >/dev/null || true
  sleep 3
  VI=$(cli run "$COMPANY" getVoteInfo "{\"owner\":\"$(legacy "$HOLDER")\"}" --abi "$CT/CompanySIIR.abi.json" 2>/dev/null \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(str(d.get("voted","?")).lower())' 2>/dev/null || echo "?")
  if [ "${DEMO_GOVERNANCE:-0}" = "1" ]; then
    # 14b'. weighted vote path (governance enabled): zero-weight holder vote
    # is rejected; founder's vote reaches the quorum => auto-dissolve
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m dissolveCompany '{}' >/dev/null 2>&1 || true
    sleep 3
    [ "$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_dissolved",False)).lower())' 2>/dev/null)" = "false" ] \
      && echo "  [ok] founder dissolveCompany rejected before quorum (ERR_QUORUM_NOT_MET)" || echo "  [fail] dissolved without quorum"
    [ "$VI" = "false" ] && echo "  [ok] zero-weight holder vote rejected (ERR_NOT_OWNER)" || echo "  [fail] holder vote recorded (voted=$VI)"
    echo "  after holder vote: $(GOV_FMT)"
    VS1=$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_dissolveVotes",0)))' 2>/dev/null || echo "?")
    [ "$VS1" = "0" ] && echo "  [ok] no votes counted (holder holds no SIIR after the marketplace round)" || echo "  [fail] dissolve votes=$VS1 (expect 0)"
    [ "$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_dissolved",False)).lower())' 2>/dev/null)" = "false" ] \
      && echo "  [ok] quorum not met yet: company still operating" || echo "  [fail] dissolved before quorum"
    cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
      "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP},\"bounce\":true,\"flags\":1,\
        \"payload\":\"$(body "$CT/CompanySIIR.abi.json" voteDissolve '{}')\"}" >/dev/null || true
    sleep 3
    VS2=$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_dissolveVotes",0)))' 2>/dev/null || echo "?")
    [ "$VS2" = "100000" ] && echo "  [ok] dissolve votes = 100000 (founder holds all SIIRs)" || echo "  [fail] dissolve votes=$VS2 (expect 100000)"
    [ "$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_dissolved",False)).lower())' 2>/dev/null)" = "true" ] \
      && echo "  [ok] quorum met: company dissolved by vote" || echo "  [fail] not dissolved after quorum"
    echo "  after founder vote: $(GOV_FMT)"
  else
    [ "$VI" = "false" ] && echo "  [ok] voteDissolve rejected while governance disabled" || echo "  [fail] vote accepted (voted=$VI)"
    # 14c. founder dissolves (governance disabled => founder alone)
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m dissolveCompany '{}' >/dev/null 2>&1 || true
    sleep 3
    echo "  after dissolve: $(GOV_FMT)"
  fi
  # 14d. one final distribution may still be deposited during the grace period
  # (1 eccUSDC dividend + SHELL fuel slice; a bare 1e9 of SHELL alone would
  # be rejected as ERR_BAD_DIVIDEND_CURRENCY — SHELL is never a dividend)
  cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":3000000000,\"cc\":{\"2\":$F_OP,\"3\":1000000000},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" depositDividends '{"currencyIds":["3"]}')\"}" >/dev/null || true
  sleep 3
  FD=$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_finalDeposited","?")).lower())' 2>/dev/null || echo "?")
  [ "$FD" = "true" ] && echo "  [ok] one final distribution accepted after dissolution" || echo "  [fail] final deposit rejected (finalDeposited=$FD)"
  # 14e. finalize is blocked until the grace period ends (30 days)
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m finalizeDissolution '{}' >/dev/null 2>&1 || true
  sleep 3
  FZ=$(GOV | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("_finalized","?")).lower())' 2>/dev/null || echo "?")
  [ "$FZ" = "false" ] && echo "  [ok] finalize blocked before grace ends (ERR_GRACE_NOT_OVER)" || echo "  [fail] finalized early (finalized=$FZ)"
  GOV
fi

echo "== done. factory: $FACTORY  company: $COMPANY  rounds: $COMPANY_B  marketplace: $MARKET =="
# register companies for the content gateway (scripts/gateway.py)
echo "{\"companies\":[{\"address\":\"$COMPANY\",\"tag\":\"model-a\"},{\"address\":\"$COMPANY_B\",\"tag\":\"rounds\"}]}" > "$WORK/companies.json"
echo "  gateway index -> $WORK/companies.json"