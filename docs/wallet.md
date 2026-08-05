# Wallets on Acki Nacki — creation, standards, and how they hold things

Everything learned about creating accounts on Acki Nacki, the wallet standards
in the ecosystem, and — critically — why the SIIR protocol does **not** need a
special "wallet" contract to hold SIIRs.

---

## 1. Accounts, addresses, Dapp roots

An Acki Nacki account is identified by an extended address

```
<dapp_id> :: <account_id>
```

- `dapp_id` — a 64-hex namespace. A contract **deployed by external message
  becomes its own Dapp root**; anything it deploys internally inherits that
  `dapp_id`.
- `account_id` — a 64-hex hash derived from (code + initial data + pubkey).
- Legacy `0:hex` is shorthand used by tooling/ABI params; for a self-rooted
  contract it resolves to `<hex>::<hex>`.

`tvm-cli` rules (v3, learned the hard way):

- the `account`, `run`, `callx --- addr` positional takes the **extended**
  form `dapp::acct`;
- **ABI `address` parameters in JSON** (e.g. `dest`, `founder`, `newOwner`)
  take the **legacy `0:hex`** form — extended is rejected with
  "can not parse address";
- `tvm-cli genaddr` prints a bare `0:hex` (that is the `account_id`, dapp
  independent);
- account lookups must use extended; legacy gets `Not found`.

### The zero-Dapp

System contracts (DappRoot, the giver, mvsystem) live in
`0000...0::<their account>`. User dapps are self-rooted pairs `<self>::<self>`.

---

## 2. Creating a wallet (the classic multisig)

The default all-purpose wallet on Acki Nacki is the Everscale-style
**UpdateCustodianMultisigWallet** (setcode multisig 2.0), precompiled in the
official package at:

```
contracts/0.79.3_compiled/updatecustodianmultisigwallet/UpdateCustodianMultisigWallet.tvc
contracts/0.79.3_compiled/updatecustodianmultisigwallet/UpdateCustodianMultisigWallet.abi.json
```

### 2.1 Constructor

```
constructor(
    uint256[] owners_pubkey,     // signer public keys
    address[]   owners_address,  // optional non-key owners
    uint8       reqConfirms,     // confirmations needed (1 for single owner)
    uint8       reqConfirmsData, // data confirmations
    uint64      value            // VMSHELL kept as reserve
)
```

A single-owner wallet:

```json
{"owners_pubkey":["0x<pubkey>"],"owners_address":[],
 "reqConfirms":1,"reqConfirmsData":1,"value":1000000000}
```

### 2.2 The full creation pipeline (what actually works)

```bash
NET=shellnet.ackinacki.org
GIVER="0:1111111111111111111111111111111111111111111111111111111111111111"

# 1. keypair
tvm-cli -j -u $NET genphrase --dump wallet.keys.json

# 2. bake the pubkey into a tvc copy and learn the account_id
cp UpdateCustodianMultisigWallet.tvc wallet.tvc
RAW=$(tvm-cli -j -u $NET genaddr wallet.tvc --abi UpdateCustodianMultisigWallet.abi.json \
        --setkey wallet.keys.json --save \
      | grep -i raw | awk '{print $NF}' | tr -d '",' | sed 's/^0://')
#    ^   --save is mandatory: it writes the pubkey INTO wallet.tvc.
#    ^   without it, the deployed contract's data carries pubkey = 0
#        (the multisig then can never authorize anything).

# 3. fund the account (VMSHELL gas via flag 16; SHELL ecc via sendCurrency)
tvm-cli -j -u $NET callx --abi GiverV3.abi.json --addr "$GIVER" -m sendCurrencyWithFlag \
  "{\"dest\":\"0:$RAW\",\"value\":1000000000,\"ecc\":{\"2\":10000000000},\"flag\":16}"
tvm-cli -j -u $NET callx --abi GiverV3.abi.json --addr "$GIVER" -m sendCurrency \
  "{\"dest\":\"0:$RAW\",\"value\":1000000000,\"ecc\":{\"2\":50000000000}}"

# 4. deploy (self-rooted: --dst-dapp-id = your own account_id)
tvm-cli -j -u $NET deploy --abi UpdateCustodianMultisigWallet.abi.json \
  --sign wallet.keys.json --dst-dapp-id "$RAW" wallet.tvc \
  "{\"owners_pubkey\":[\"0x$PUB\"],\"owners_address\":[],\"reqConfirms\":1,\"reqConfirmsData\":1,\"value\":1000000000}"
```

The wallet lives at `RAW::RAW` and is immediately functional.

> Pitfall: if you deploy once to a funded account and it does not
> show `Active`, the funding had not propagated yet — **re-send the identical
> deploy** (address is deterministic, messages are idempotent). Poll
> `cli account "$RAW::$RAW"` for `acc_type: Active`.

### 2.3 What a wallet can do — acting on other contracts

The multisig exposes `sendTransaction`, which wraps any call to any contract:

```
sendTransaction(dest, value, cc, bounce, flags, payload)
```

- `dest` — the target's legacy `0:hex` address.
- `value` — VMSHELL nanotokens attached (cross-Dapp: nullified — pay target
  gas with `tvm.accept()` / freemium instead).
- `cc` — `mapping(uint32 => varuint32)`; put SHELL here:
  `{"2": <nano>}`. This is how a wallet **pays a dividend**.
- `payload` — the **encoded method call**, produced with:

```bash
BODY=$(tvm-cli -j -u $NET body --abi Target.abi.json someMethod '{"arg":1}'
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["Message"])')
```

(`tvm-cli body` prints `{"Message":"te6ccg..."}` — you must unwrap the
`Message` key to get the payload cell.)

Signed by a key in `owners_pubkey`, the multisig forwards the message on your
behalf, so `msg.sender` at the target **is the wallet's address**.

---

## 3. Wallet standards in the ecosystem

### 3.1 TIP-3 — the official token standard

`contracts/token/` in `ackinacki/ackinacki` defines the canonical token model:

| contract      | role |
|---------------|------|
| `RootToken`   | authority: `static _deployer/_name/_decimals`, `_totalSupply` |
| `TokenWallet` | **one per (root, holder)**: `static _owner` + `uint128 _balance` |
| `Transaction` | per-transfer record |

The wallet contract here is *not a user wallet* — it is a per-holder token
ledger. Balances live in per-root wallet contracts, never in the holder's
"main" wallet.

### 3.2 AFT — community TEP-74-style standard

`acki-center/contracts` → AFT token + `AckiSmartWallet`:

- **AFTRoot / AFTWallet**: master/wallet split adapted to SHELL fuel and
  `dapp_id` boundaries. Uses `msg.currencies[CURRENCIES_ID_SHELL]` and
  `gosh.cnvrtshellq` to move fuel across hops.
- **AckiSmartWallet**: thin single-owner **proxy**:
  ```solidity
  uint256 static _publicKey;
  mapping(address => bool) _extensions;
  mapping(address => uint8) _extensionPermissions;
  function sendMessages(OutboundAction[] actions, address viaExtension) public;
  ```
  It stores **no token balances** — assets live in the respective roots/wallets
  (or natively). Extensions add recovery, spending limits, sponsorship,
  subscriptions. This is the architecture the official mobile wallet line
  (NACKL / USDC / SHELL, ZK-login, Bee Engine) is built around.

### 3.3 PopCoinWallet — per-holder item storage

`contracts/0.79.3_compiled/mvsystem/PopCoinWallet.sol` (game items / popits):

```solidity
address   _root;
uint64    ...;
mapping(uint256 => uint64) _popits_candidate;
mapping(uint256 => uint64) _popits_mbi;
```

- Wallet-state = `map(popitId -> value)`.
- Canonical metadata (`popits_media`) lives in **PopCoinRoot**, never in the
  wallet.
- Root mints items into wallets; there is **no wallet-to-wallet transfer**
  surface for popits in this code — items are minted per player.

This is the "regular NFT-ish" pattern — and precisely why SIIR does **not**
follow it (see below).

---

## 4. How SIIR's "wallet-hosting" works — and why it needs no wallet code

SIIRs are non-fungible and **wallet-to-wallet transferable**. Ownership is a
state change in the register:

```solidity
mapping(uint256 => SIIR) _siirs;   // id -> { weight, owner, ... }
function transfer(uint256[] ids, address newOwner) public {
    require(_siirs[id].owner == msg.sender, ...);
    _siirs[id].owner = newOwner;               // that's the transfer
}
```

Consequences:

- **Any wallet (or even a bare key) can hold SIIRs.** The holder is simply the
  `owner` address recorded in the company contract — validators read
  `getSIIRsOf(address)`.
- No popit-style balance map is needed on the holder side; nothing to get out
  of sync, no per-holder contract per company.
- Wallet **interactions** are the standard ones:
  - creator / founder (`issue`) — external message signed by the founder
    pubkey (see below on `addr_extern`);
  - holder (`transfer`, `claim`) — internal messages via any wallet's
    `sendTransaction` with a `tvm-cli body` payload.
- The official `AckiSmartWallet` (extensions + batched `sendMessages`) is a
  natural production holder: it forwards `transfer`/`claim`, its UI reads the
  register, and a future `SIIRhoding` extension could cache ids off-chain.

### External-call address subtlety (critical)

On Acki Nacki, **external messages enter with `msg.sender` = an
`addr_extern`** (a channel-style fake address), **not** `address(this)` as on
classic Everscale. Therefore:

- Founder/owner authorization for external calls must compare
  `msg.pubkey()` (the signing key), never `msg.sender == address(this)`.
- In `CompanySIIR._isFounder`:
  ```solidity
  require(
      (msg.sender == _founder) ||            // internal: the founder wallet
      (msg.pubkey() == _founderPubkey),      // external: signed with founder key
      ...
  );
  ```

---

## 5. Cheat sheet

| thing | form / call |
|---|---|
| account query | `tvm-cli account "<dapp>::<acct>"` |
| `--addr` (run/callx/deploy) | extended `<dapp>::<acct>` |
| ABI JSON `address` param | `0:<acct>` |
| keypair | `tvm-cli genphrase --dump k.json` |
| compute + bake address | `tvm-cli genaddr w.tvc --abi w.abi.json --setkey k.json --save` |
| deploy self-rooted | `tvm-cli deploy --abi w.abi.json --sign k.json --dst-dapp-id <own> w.tvc <ctor>` |
| fund gas | giver `sendCurrencyWithFlag`, `flag:16` |
| fund SHELL floor | giver `sendCurrency` |
| forward a call | wallet `sendTransaction` + `tvm-cli body` `Message` payload |
| read SHELL balance | `address(this).currencies[2]` |
| read inbound SHELL | `msg.currencies[2]` |
| send SHELL | `dest.transfer({value, bounce, flag, currencies: {2: n}})` |