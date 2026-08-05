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
      \"initialValue\":20000000000}" >/dev/null || true
  wait_active "$COMPANY" "company"
fi
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"

# ---------- 5. issue genesis ----------
echo "== 5. issue genesis =="
ISSUED=$(cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["issuedCount"])')
[ "$ISSUED" = "0" ] && {
  cli callx --abi "$CT/CompanySIIR.abi.json" --addr "$COMPANY" --keys "$WORK/company.keys.json" -m issue '{}' >/dev/null || true
  sleep 3
}
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
OWNER=$(cli run "$COMPANY" getOwnerOf '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["value0"])')
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

# ---------- 8. deposit dividends (10 SHELL) ----------
echo "== 8. deposit 10 SHELL dividends =="
cli callx --abi "$MULTISIG_ABI" --addr "$FOUNDER" --keys "$WORK/company.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":1000000000,\"cc\":{\"2\":10000000000},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" depositDividends '{}')\"}" >/dev/null || true
sleep 3
cli run "$COMPANY" getCompanyInfo {} --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"

# ---------- 9. claim ----------
echo "== 9. holder claims =="
cli callx --abi "$MULTISIG_ABI" --addr "$HOLDER" --keys "$WORK/holder.keys.json" -m sendTransaction \
  "{\"dest\":\"$(legacy "$COMPANY")\",\"value\":1000000000,\"cc\":{},\"bounce\":true,\"flags\":1,\
    \"payload\":\"$(body "$CT/CompanySIIR.abi.json" claim '{"ids":["1"]}')\"}" >/dev/null || true
sleep 3
echo "  after claim:"
cli run "$COMPANY" getSIIR '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getClaimable '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"
cli run "$COMPANY" getHistory '{"id":"1"}' --abi "$CT/CompanySIIR.abi.json"
cli account "$HOLDER" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  holder ecc:", d.get("ecc_balance"), "vmshell:", d.get("balance"))'

echo ""
echo "== done. factory: $FACTORY  company: $COMPANY =="