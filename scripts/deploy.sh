#!/usr/bin/env bash
# SIIR shellnet demo " full lifecycle:
#   factory -> company -> issue -> holder -> transfer -> deposit (SHELL) -> claim
#
# Requires: sold, tvm-cli (v3+, extended dapp_id::account_id addresses).
#
# Addressing model on Acki Nacki:
#   * self-rooted (deployed via external message) contracts live at <own>::<own>
#   * children deployed by a contract inherit the parent's dapp_id
#   * tvm-cli ABI address params use legacy "0:hex"; CLI --addr/account use extended
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

fund() { # fund <self-or-full> <shell_nano>  — VMSHELL gas (flag16) + SHELL ecc (raw)
  echo "  funding $1 with $2 nano SHELL (VMSHELL gas + SHELL ecc)..."
  local gas=$(( $2 / 5 ))
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrencyWithFlag \
    "{\"dest\":\"$(legacy "$1")\",\"value\":1000000000,\"ecc\":{\"2\":$gas},\"flag\":16}" >/dev/null
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
    "{\"dest\":\"$(legacy "$1")\",\"value\":1000000000,\"ecc\":{\"2\":$2}}" >/dev/null
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
UI_BUNDLE=$(python3 - <<'PY'
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
    sleep 3
    cli account "$(self "$R")" 2>/dev/null | grep -q '"Active"' && return 0
    sleep 3
  done
  echo "[fail] deploy ${name} (${R}) not active after retries"; exit 1
}

run() { cli run "$1" "$2" "$3" --abi "$4" 2>&1; }

# does the deployed factory hold the current CompanySIIR code cell?
factory_code_stale() {
  local local_code stored
  local_code=$(company_code)
  stored=$(cli run "$1" getCompanyCode '{}' --abi "$CT/SIIRFactory.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"])' 2>/dev/null || echo "")
  [ "$stored" != "$local_code" ]
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
if ! cli account "$FACTORY" 2>/dev/null | grep -q '"Active"' || factory_code_stale "$FACTORY"; then
  if factory_code_stale "$FACTORY"; then
    echo "  factory holds stale company code; redeploying..."
    cli genphrase --dump "$WORK/factory.keys.json" >/dev/null
    FACTORY_RAW=$(bake SIIRFactory "$WORK/factory.keys.json" "$CT/SIIRFactory.abi.json"); save_baked factory "$FACTORY_RAW"
    FACTORY=$(self "$FACTORY_RAW")
  fi
  fund "$FACTORY" 100000000000
  sleep 5
  echo "  deploying factory..."
  deploy_self SIIRFactory "$WORK/factory.keys.json" "$CT/SIIRFactory.abi.json" \
    "{\"value\":10000000000,\"companyCode\":\"$(company_code)\"}"
  wait_active "$FACTORY" "factory"
fi
cli run "$FACTORY" getFactoryInfo {} --abi "$CT/SIIRFactory.abi.json"

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
  fund "$FOUNDER" 50000000000
  sleep 3
  deploy_self founder "$WORK/company.keys.json" "$MULTISIG_ABI" \
    "{\"owners_pubkey\":[\"0x$FOUNDER_PUB\"],\"owners_address\":[],\"reqConfirms\":1,\"reqConfirmsData\":1,\"value\":1000000000}"
  wait_active "$FOUNDER" "founder wallet"
fi

# ---------- 4. company ----------
echo "== 4. company =="
COMPANY_RAW=$(cli run "$FACTORY" getCompanyAddress \
  "{\"founder\":\"$(legacy "$FOUNDER")\",\"founderPubkey\":\"0x$FOUNDER_PUB\"}" --abi "$CT/SIIRFactory.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"].split(":")[1])')
COMPANY="$FACTORY_RAW::$COMPANY_RAW"
echo "  company (in factory dapp): $COMPANY"
if ! cli account "$COMPANY" 2>/dev/null | grep -q '"Active"'; then
  echo "  deploying company via factory..."
  cli callx --abi "$CT/SIIRFactory.abi.json" --addr "$FACTORY" --keys "$WORK/factory.keys.json" \
    -m deployCompany \
    "{\"name\":\"NJD Ventures\",\"description\":\"SIIR demo company\",\"website\":\"https://njd.example\",\
      \"metadataUri\":\"ipfs://QmSIIRdemo\",\"founder\":\"$(legacy "$FOUNDER")\",\"founderPubkey\":\"0x$FOUNDER_PUB\",\
      \"issuanceModel\":0,\"plans\":[{\"count\":100,\"weight\":1000,\"label\":\"Genesis\",\"issued\":false}],\
      \"logoImage\":\"$LOGO_SVG\",\"siirImage\":\"$SIIRIMG_SVG\",\"ui\":\"$UI_BUNDLE\",\
      \"charter\":$CHARTER,\"initialValue\":20000000000}" >/dev/null || true
  wait_active "$COMPANY" "company"
fi
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"

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
  fund "$HOLDER" 50000000000
  sleep 3
  deploy_self holder "$WORK/holder.keys.json" "$MULTISIG_ABI" \
    "{\"owners_pubkey\":[\"0x$HOLDER_PUB\"],\"owners_address\":[],\"reqConfirms\":1,\"reqConfirmsData\":1,\"value\":1000000000}"
  wait_active "$HOLDER" "holder wallet"
fi

# ---------- 7. transfer SIIR #1 -> holder ----------
echo "== 7. transfer SIIR #1 to holder =="
OWNER=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value0",""))' 2>/dev/null || echo "")
echo "  SIIR #1 owner: $OWNER"
if [ "$OWNER" != "0:$FOUNDER_RAW" ]; then
  echo "  owner is not founder wallet; skipping transfer"
else
  cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
    "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":1000000000,\"cc\":{},\"bounce\":true,\"flags\":1,\
      \"payload\":\"$(body "$CT/CompanySIIR.abi.json" transfer "{\"ids\":[\"1\"],\"newOwner\":\"$(legacy "$HOLDER")\"}")\"}" >/dev/null || true
  sleep 3
  cli run "$COMPANY" getSIIR '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"
fi

# ---------- 8. deposit dividends (10 SHELL + 5,000 eccUSDC) ----------
echo "== 8. deposit 10 SHELL + 5000 eccUSDC dividends =="
# the founder wallet must actually hold both payout currencies to attach them
FBAL=$(cli account "$FOUNDER" 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ecc_balance",{}).get("3",0))' 2>/dev/null || echo 0)
FBAL2=$(cli account "$FOUNDER" 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ecc_balance",{}).get("2",0))' 2>/dev/null || echo 0)
[ "${FBAL:-0}" -lt 5000000000000 ] && cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
  "{\"dest\":\"$(legacy "$FOUNDER")\",\"value\":1000000000,\"ecc\":{\"3\":5000000000000}}" >/dev/null || true
[ "${FBAL2:-0}" -lt 20000000000 ] && cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
  "{\"dest\":\"$(legacy "$FOUNDER")\",\"value\":1000000000,\"ecc\":{\"2\":20000000000}}" >/dev/null || true
sleep 3
PRE_USDC=$(cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("depositedUsdc","0"))' 2>/dev/null || echo 0)
cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":1000000000,\"cc\":{\"2\":10000000000,\"3\":5000000000000},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" depositDividends '{}')\"}" >/dev/null || true
for attempt in $(seq 1 15); do
  NOW_USDC=$(cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("depositedUsdc","0"))' 2>/dev/null || echo 0)
  [ "$NOW_USDC" != "$PRE_USDC" ] && break
  sleep 2
done
[ "$NOW_USDC" = "$PRE_USDC" ] && { echo "  [fail] deposit never landed (pre=$PRE_USDC post=$NOW_USDC)"; exit 1; }
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"

# ---------- 9. claim ----------
echo "== 9. holder claims (SHELL + eccUSDC in one transfer) =="
cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":1000000000,\"cc\":{},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" claim '{"ids":["1"]}')\"}" >/dev/null || true
for attempt in $(seq 1 15); do
  OUT=$(cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" 2>/dev/null || true)
  SHELL_LEFT=$(echo "$OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("shell","x"))' 2>/dev/null || echo x)
  USDC_LEFT=$(echo "$OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("usdc","x"))' 2>/dev/null || echo x)
  [ "$SHELL_LEFT" = "0" ] && [ "$USDC_LEFT" = "0" ] && break
  sleep 2
done
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
COMPANY_B="$FACTORY_RAW::$B_RAW"
echo "  rounds company: $COMPANY_B"
if ! cli account "$COMPANY_B" 2>/dev/null | grep -q '"Active"'; then
  echo "  deploying rounds company via factory..."
  # factory spends initialValue in VMSHELL per company; refill if running low
  FB=$(cli account "$FACTORY" 2>/dev/null | python3 -c 'import json,sys; print(int(json.load(sys.stdin).get("balance") or 0))' 2>/dev/null || echo 0)
  [ "${FB:-0}" -lt 40000000000 ] && { echo "  factory vmshell low (${FB}); refilling..."; fund "$FACTORY" 125000000000; sleep 5; }
  cli callx --abi "$CT/SIIRFactory.abi.json" --addr "$FACTORY" --keys "$WORK/factory.keys.json" \
    -m deployCompany \
    "{\"name\":\"Rounds Inc\",\"description\":\"model-B company\",\"website\":\"\",\"metadataUri\":\"\",\
      \"founder\":\"$(legacy "$HOLDER")\",\"founderPubkey\":\"0x$B_FOUNDER_PUB\",\"issuanceModel\":1,\
      \"plans\":[{\"count\":50,\"weight\":1000,\"label\":\"Genesis\",\"issued\":false},\
                {\"count\":25,\"weight\":2000,\"label\":\"Round 1\",\"issued\":false},\
                {\"count\":25,\"weight\":4000,\"label\":\"Round 2\",\"issued\":false}],\
      \"logoImage\":\"$LOGO_SVG\",\"siirImage\":\"$SIIRIMG_SVG\",\"ui\":\"\",\
      \"charter\":$CHARTER,\"initialValue\":20000000000}" >/dev/null || true
  wait_active "$COMPANY_B" "rounds company" 120
fi
run_info_b() { cli run "$COMPANY_B" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("    issuedCount=%s totalWeight=%s model=%s"%(d.get("issuedCount","?"),d.get("totalWeight","?"),d.get("issuanceModel","?")))'; }
b_count() { cli run "$COMPANY_B" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("issuedCount","0"))' 2>/dev/null || echo 0; }
issue_until() { # issue_until <keys-file> <target-count> — founder = holder
  local keys=$1 target=$2 n
  n=$(b_count)
  for attempt in $(seq 1 8); do
    [ "$n" -ge "$target" ] && return 0
    cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$keys" -m issue '{}' >/dev/null 2>&1 || true
    sleep 4
    n=$(b_count)
  done
  echo "[fail] issue stopped at $n (wanted $target)"; exit 1
}
echo "  issuing genesis..."
issue_until "$WORK/holder.keys.json" 50 && run_info_b
echo "  issuing round 1..."
issue_until "$WORK/holder.keys.json" 75 && run_info_b
echo "  issuing round 2..."
issue_until "$WORK/holder.keys.json" 100 && run_info_b
echo "  extra issue (expect supply-exceeded rejection):"
for attempt in $(seq 1 8); do
  OUT=$(cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY_B" --keys "$WORK/holder.keys.json" -m issue '{}' 2>&1 || true)
  EC=$(echo "$OUT" | python3 -c 'import json,sys,re; t=sys.stdin.read(); m=re.search(r"\"exit_code\":\s*(-?\d+)", t); print(m.group(1) if m else "0")')
  [ "$EC" != "0" ] && { echo "  exit_code: $EC"; break; }
  sleep 4
done
cli run "$COMPANY_B" getPlans {} --abi "$CT/CompanySIIR.abi.json"

# ---------- 11. on-chain content: round-trip + size-cap enforcement ----------
echo "== 11. on-chain content =="
ct_get() { cli run "$1" "$2" '{}' --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$3', d.get('value0','')))"; }
SZ_LOGO=$(ct_get "$COMPANY" getContentInfo logoSize); SZ_SIIR=$(ct_get "$COMPANY" getContentInfo siirImageSize); SZ_UI=$(ct_get "$COMPANY" getContentInfo uiSize)
echo "  content sizes: logo=$SZ_LOGO siirImage=$SZ_SIIR ui=$SZ_UI (bytes)"
R_LOGO=$(ct_get "$COMPANY" getCompanyImage img); R_SIIR=$(ct_get "$COMPANY" getSIIRImage img); R_UI=$(ct_get "$COMPANY" getUI ui)
[ "$R_LOGO" = "$LOGO_SVG" ] && echo "  [ok] company logo round-trips on-chain" || echo "  [fail] logo mismatch"
[ "$R_SIIR" = "$SIIRIMG_SVG" ] && echo "  [ok] SIIR deed image round-trips on-chain" || echo "  [fail] siir image mismatch"
[ "$R_UI" = "$UI_BUNDLE" ] && echo "  [ok] static UI bundle round-trips on-chain" || echo "  [fail] ui mismatch"
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

echo ""
echo "== done. factory: $FACTORY  company: $COMPANY  rounds: $COMPANY_B =="
# register companies for the content gateway (scripts/gateway.py)
echo "{\"companies\":[{\"address\":\"$COMPANY\",\"tag\":\"model-a\"},{\"address\":\"$COMPANY_B\",\"tag\":\"rounds\"}]}" > "$WORK/companies.json"
echo "  gateway index -> $WORK/companies.json"