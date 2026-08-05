# GiverV3 — Funding wallets & contracts on Acki Nacki

The **GiverV3** contract is the faucet that funds accounts on Acki Nacki. It is
part of the official protocol contracts (`contracts/giver/` in
`ackinacki/ackinacki`), precompiled for the live node at
`contracts/0.79.3_compiled/giver/`. On shellnet, the giver acting as the public
faucet is paid-for by the network (freemium), so its calls require no owner
keys.

---

## 1. The contract at a glance

- Source: `contracts/giver/GiverV3.sol`
- ABI: `contracts/giver/GiverV3.abi.json`
- Precompiled: `contracts/0.79.3_compiled/giver/GiverV3.tvc` / `.abi.json`
- Live (shellnet) address: `1111111111111111111111111111111111111111111111111111111111111111`
  in the zero Dapp, i.e. extended address
  `0000000000000000000000000000000000000000000000000000000000000000::1111111111111111111111111111111111111111111111111111111111111111`
  - older callers use the legacy shorthand `0:1111111111111111111111111111111111111111111111111111111111111111`.
- The giver can **mint its own SHELL on demand** via the `gosh.mintecc` VM
  opcode (`_mintEccIfNeeded`), which is why a single giver address can fuel an
  arbitrary number of targets forever.

### Currencies (ecc map) the giver deals with

| ecc key | token | decimals | note |
|---------|-------|----------|------|
| 1       | NACKL | 9        | network-security/staking token |
| 2       | SHELL | 9        | computation token; converts 1:1 to VMSHELL |
| 3       | eccUSDC | 6       | ecc-wrapped stablecoin |

All amounts in messages are **nanotokens** (1 SHELL = 1e9 nano).

---

## 2. Public request methods

All are guarded by the `accept` modifier (`tvm.accept()`) so the giver, not the
caller, pays gas. Replay protection: every signed request maps its
`expireAt -> messageHash` into `m_messages`; duplicates are rejected.

### `sendTransaction(dest, value, bounce)`

- `value`: nanotokens of **VMSHELL**. Only reaches recipients in the same Dapp
  ID; cross-Dapp it is **nullified**.
- `bounce: bool`, flag defaults to `3` (carry nothing extra).
- Rarely useful for funding undeployed contracts; prefer the currency methods.

### `sendCurrency(dest, value, ecc)`  ← use for SHELL floor

- `value`: VMSHELL nanotokens (attached; cross-Dapp it is zeroed).
- `ecc`: `mapping(uint32 => varuint32)` of **ecc tokens delivered as-is** into
  the destination's currency balance. SHELL sent with this method **stays
  SHELL (ecc)** at the destination — it is NOT converted to VMSHELL.
- Internal flags `1`, `bounce: false`.
- This is the call to credit a **wallet with sellable/forwardable SHELL**.

```
tvm-cli -j -u shellnet.ackinacki.org callx \
  --abi contracts/giver/GiverV3.abi.json \
  --addr "0:1111...1" \
  -m sendCurrency \
  '{"dest":"0:<target-hex>","value":1000000000,"ecc":{"2":20000000000}}'
```

### `sendCurrencyWithFlag(dest, value, ecc, flag)`  ← use for deploy gas

- Identical to `sendCurrency` but lets you pass `flag`.
- **`flag: 16`** = "SHELL in `ecc` is converted to VMSHELL at the
  destination". This is how you deliver **VMSHELL** to an account so it can pay
  gas / be deployed.
- Also works when the destination is **not yet initialized** (uninit account) —
  the value still lands.

```
tvm-cli -j -u shellnet.ackinacki.org callx \
  --abi contracts/giver/GiverV3.abi.json \
  --addr "0:1111...1" \
  -m sendCurrencyWithFlag \
  '{"dest":"0:<target-hex>","value":1000000000,"ecc":{"2":100000000000},"flag":16}'
```

### `sendCurrencyWithBody(dest, value, ecc, flag, body)`

- Like `sendCurrencyWithFlag` but also attaches a call `body` — one message
  funds *and* invokes a method (e.g. deploy-and-call patterns).

### `sendFreeToken(dest)`

- Drops `50 vmshell` worth of SHELL (`ecc {2: 50e9}`) plus `10 vmshell`
  gas to anyone. Used for on-ramping test accounts.

### Caps

- `MAX_SEND_VALUE = 10000000 vmshell`
- `MAX_SEND_ECC   = 10000000000000000` (10^16 nano)
- Requests above these are **clamped**, not rejected.

---

## 3. How funding actually lands (the Dapp mechanics)

The single most important thing learned while building SIIR:

1. Accounts have an **extended address** `<dapp_id>::<account_id>`
   (two 64-hex values). A legacy `0:hex` shorthand exists but maps to
   `<hex>::<hex>` (the account as its own Dapp root).
2. **VMSHELL can only move inside one Dapp ID.** Sent cross-Dapp it is
   zeroed. **SHELL (ecc) moves anywhere.**
3. An account that will be **deployed by an external message** becomes its own
   Dapp root. Funding it with a legacy `0:<hex>` giver call therefore lands at
   `<hex>::<hex>`, and the deploy later must target that self-rooted pair.
4. When the target is undeployed, `flag: 16` makes the delivery stick anyway
   (the account object is created, `acc_type: Uninit`, balance credited).

Practical consequence for `scripts/deploy.sh` — **fund a wallet twice**:

```
fund() { # VMSHELL gas (flag 16) + SHELL ecc (raw)
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrencyWithFlag \
    "{\"dest\":\"$(legacy "$1")\",\"value\":1000000000,\"ecc\":{\"2\":$gas},\"flag\":16}"
  cli callx --abi "$GIVER_ABI" --addr "$GIVER_FULL" -m sendCurrency \
    "{\"dest\":\"$(legacy "$1")\",\"value\":1000000000,\"ecc\":{\"2\":$full}}"
}
```

- The `flag: 16` leg gives VMSHELL → the account can be **deployed** and pay
  for its own gas.
- The `sendCurrency` leg gives SHELL **as ecc** → the wallet can later attach
  SHELL to outbound messages (e.g. paying SIIR dividends), which VMSHELL-only
  wallets cannot.

> If a wallet tries `transfer({..., currencies: {2: x}})` while holding zero
> SHELL, its transaction **aborts** (insufficient ecc balance). Credit ecc
> floor with `sendCurrency`.

---

## 4. GiverV3 source highlights

```solidity
function sendCurrency(address dest, varuint16 value, mapping(uint32 => varuint32) ecc) public accept saveMsg {
    if (value > MAX_SEND_VALUE) value = MAX_SEND_VALUE;
    for (uint32 id = 1; id <= 3; id++)
        if (ecc.exists(id) && ecc[id] > MAX_SEND_ECC) ecc[id] = MAX_SEND_ECC;
    _mintEccIfNeeded(ecc);
    if (address(this).balance <= value + 1000 vmshell)
        gosh.mintshellq(uint64(value + 1000 vmshell - address(this).balance));
    dest.transfer({value: value, bounce: false, flag: 1, currencies: ecc});
}

function _mintEccIfNeeded(mapping(uint32 => varuint32) ecc) private pure {
    for (uint32 id = 1; id <= 3; id++)
        if (ecc.exists(id))
            if (address(this).currencies[id] < ecc[id])
                gosh.mintecc(uint64(ecc[id]) - uint64(address(this).currencies[id]), id);
}
```

Takeaways you can copy into any contract:

- `dest.transfer({value, bounce, flag, currencies: ecc})` is how a contract
  ships ecc tokens in one message.
- `gosh.mintecc(amount, id)` mints ecc currency (freemium).
- `gosh.mintshellq(amount)` tops up VMSHELL balance for the tx.
- `address(this).currencies[id]` reads a current ecc balance; `msg.currencies`
  reads the ecc attached to the *incoming* message.
- `address(this).balance` = VMSHELL (one-way from SHELL via `gosh.cnvrtshellq`).

---

## 5. End-to-end example (from the SIIR shellnet demo)

```
# fund the founder wallet: deploy gas + SHELL floor
tvm-cli -j -u shellnet.ackinacki.org callx --abi $GIVER_ABI \
  --addr "0:1111...1" -m sendCurrencyWithFlag \
  '{"dest":"0:4de04d6ac25902a1ddb4618d9b3b7f4e86dab3799b9469a41a9c5cb2af267818",
    "value":1000000000,"ecc":{"2":10000000000},"flag":16}'

tvm-cli -j -u shellnet.ackinacki.org callx --abi $GIVER_ABI \
  --addr "0:1111...1" -m sendCurrency \
  '{"dest":"0:4de04d6ac25902a1ddb4618d9b3b7f4e86dab3799b9469a41a9c5cb2af267818",
    "value":1000000000,"ecc":{"2":50000000000}}'
```

Result you should verify (`cli account <dapp>::<acct>`):

```
acc_type: Uninit            # before deploy
balance:  ~11e9             # VMSHELL gas landed
ecc_balance: {"2": ~5e10}   # SHELL floor landed
```

Then the account is deployed (see `wallet.md`), the VMSHELL pays for
deployment+gas, and the SHELL ecc is available for forward transfers /
dividend deposits.