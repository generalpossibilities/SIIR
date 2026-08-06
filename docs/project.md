# SIIR on Acki Nacki — the full build log

From the idea to a deployed, dividend-paying protocol on shellnet. This
document records **everything**: what SIIR is, why the design is what it is,
how it was built step by step, every error encountered, and how each was solved
(and why).

---

## 1. What SIIR is and why it exists

**SIIR = the Shareholder Register is on the chain.** "The SIIR is the
shareholder register. The wallet holding the SIIR is the owner."

- A company mints **non-fungible SIIR deeds** (like share certificates /
  cap-table entries) to a wallet.
- Each SIIR = one vote-capable deed with a **weight**, a serial number, a
  creation fingerprint, and a full transfer **history**.
- SIIRs are **wallet-to-wallet transferable** — a pure ownership change in the
  register.
- **Dividends belong to the SIIR, not the holder**: whoever owns it at claim
  time gets the pending value. Buying a SIIR buys its unclaimed dividends
  (cum-dividend); no record-date shuffling.
- SIIRs **cannot be burned and are never upgraded**. SIIR = for life.

### Why this design (the "why" behind every choice)

| decision | why |
|---|---|
| Register-centric ownership (`owner` stored in the company contract) | One source of truth, no per-wallet balance maps to keep in sync; any wallet (even a bare pubkey) can hold; validators read `getSIIRsOf(wallet)`. |
| Non-fungible serialized deeds with weights | Real cap-tables have heterogeneous share classes (weights); classes are company-chosen at creation, labels are display-only, math uses weights only. |
| No valuation stored in immutable state | Company market value changes constantly; frozen-on-chain valuation would be wrong forever. The SIIR is a claim-weight, not a price. |
| Dividend index & checkpoint, not per-holder accounting | O(1) claim math: index = Σ(deposit)/Σweight; each SIIR stores only its last-claimed checkpoint. No snapshot arrays, no settlement on transfer. |
| Two issuance models (full cap / rounds) chosen at creation | Model A mints 100% once and locks supply forever. Model B = Genesis + declared rounds only — never silent issuance. Prevents founder dilution outside declared rounds. |
| SHELL (ecc, id 2) as dividend currency | VMSHELL is nullified across Dapp IDs; SHELL crosses any app boundary. Payout module is separable → swapping to a TIP-3 ecc token (eccUSDC) later = drop-in, not an accounting change. |
| Separate `SIIRFactory` that only creates companies | Clean separation: the factory is inert after deploy (stores only the company code + owner pubkey); companies are immutable and never modified. |

---

## 2. Toolchain discovery (research phase)

Acki Nacki is **not** EVM and **not** classic Everscale:

- Contracts are **gosh-Solidity** compiled by **`sold`** (the GOSH TVM
  compiler). Pragmas:
  ```solidity
  pragma gosh-solidity >=0.76.1;
  pragma AbiHeader expire;
  pragma AbiHeader pubkey;
  ```
- The node runs a **Rust TVM** (`tvm_contracts` crate) with special opcodes:
  `MINTSHELLQ/C728`, `CNVRTSHELLQ/C727`, `MINTECC/C726`, freemium gas.
- Toolchain that worked (all the mistakes I made later live in §6):
  - `sold` **0.79.3** (`sold --tvm-version gosh`) — `~/local/bin/sold`
  - `tvm-cli` v3+ (extended `dapp::acct` addresses)
  - shellnet endpoint: `shellnet.ackinacki.org`
  - official contracts reference cloned at `/tmp/opencode/acki-research/ackinacki`
  - community `acki-center/contracts` for the smart-wallet / AFT patterns

---

## 3. The contract layer

### 3.1 `SIIRFactory.sol`

```
Deploy-only factory. Immutable except an owner pubkey + the CompanySIIR code.
Deterministic company addresses via tvm.hash(stateInit) — you can know a
company's address before it exists.
```

- `constructor(uint64 value, TvmCell companyCode)` — `_ownerPubkey = tvm.pubkey()`
  (external deployment ⇒ own dapp root).
- `deployCompany(...)` — `onlyOwner` (msg.pubkey). Verifies founders/plans, then
  ```
  company = new CompanySIIR{
      stateInit: abi.encodeStateInit({contr: CompanySIIR,
                                      varInit: {_factory, _founder, _founderPubkey},
                                      code: _companyCode}),
      value: varuint16(initialValue), flag: 1
  }(...);
  ```
- `getCompanyAddress(founder, founderPubkey)` = `address.makeAddrStd(0, tvm.hash(stateInit))`.
- `getCompanyCode()` / `getFactoryInfo()` / `getVersion()`.

Why `abi.encodeStateInit` — `tvm.buildStateInit` is deprecated in these
compilers; `abi.encodeStateInit` is the supported, checked form.

### 3.2 `CompanySIIR.sol`

The register. Statics (part of address, ever-immutable):

```solidity
address static _factory;
address static _founder;
uint256 static _founderPubkey;
```

State:
```solidity
mapping(uint256 => SIIR)  _siirs;        // id -> deed
mapping(uint256 => mapping(uint256 => HistoryEntry)) _history;
mapping(uint256 => uint256) _historyCount;
TierPlan[] _plans;   uint32 _planIndex;
uint128 _dividendIndex, _totalWeight, _deposited;
```

Structs:
```solidity
struct TierPlan { uint128 count; uint128 weight; string label; bool issued; }
struct SIIR     { uint128 weight; address owner; uint128 checkpoint;
                  uint64 createdAt; uint32 round; string label; string metadataUri; }
struct HistoryEntry { address from; address to; uint64 timestamp; }
```

Methods:
- `issue()` — founder-only; mints the next declared plan into the founder's
  wallet; sets `plan.issued=true` (cannot mint a plan twice ⇒ no silent supply).
- `transfer(uint256[] ids, address newOwner)` — each id: sender must be the
  current `owner`; updates owner, appends `HistoryEntry`, emits
  `SIIRTransferred`. Wallet-to-wallet.
- `depositDividends()` — `internalMsg`; reads **SHELL attached in the message**
  (`msg.currencies[2]`), raises `_dividendIndex += amt*SCALE/_totalWeight`.
  Anyone, from any dapp, can contribute.
- `claim(uint256[] ids)` — `internalMsg`; for each owned id:
  `pending = weight * (index - checkpoint) / SCALE`; sum, bump checkpoints, then
  pay the caller **SHELL** (`transfer({value:0, flag:1, currencies:{2: total}})`).
- Getters — `getCompanyInfo`, `getPlans`, `getSIIR`, `getOwnerOf`,
  `getClaimable`, `getClaimableOf`, `getBalanceOf`, `getSIIRsOf`,
  `getFingerprint(id)` (`tvm.hash(abi.encode(weight, createdAt, round, label, metadataUri))`),
  `getHistory(id)`, `getVersion`.
- Events — `CompanyCreated, SIIRMinted, SIIRTransferred, DividendDeposited,
  DividendClaimed`.
- Auth helper `_isFounder()` — `(msg.sender == _founder) || (msg.pubkey() == _founderPubkey)`.

Constants: `SCALE = 1e9` (9 decimals, SHELL's), `CURRENCY_SHELL = 2`,
`GAS_RESERVE = 1 vmshell`, `MODEL_FULL_CAP = 0`, `MODEL_ROUNDS = 1`; errors are
`uint16` 100–107.

> The state above is **v1's materialized model**. v2.0.0 replaced the
> per-id `_siirs` map with the range-derived register (plans + segments +
> sparse overrides) described in §8. `transfer`, `depositDividends`,
> `claim`, and the getter set carry over; the deed for any id is derived
> on demand, never stored.

### 3.3 `Makefile`

```make
TVCS := CompanySIIR SIIRFactory
build: clean
	@for c in $(TVCS); do $(SOLD) --tvm-version gosh $$c.sol; done
```

(`sold` takes exactly **one** input per invocation — see §6.1.)

---

## 4. The deployment script (`scripts/deploy.sh`)

One idempotent script that runs the whole life cycle:

```
build → fund factory → deploy factory (self-rooted) → founder wallet
→ deployCompany → issue() → holder wallet → transfer #1 → deposit 10 SHELL
→ claim → verify every getter
```

Helpers that encode the hard-won knowledge:

- `bake()` — `genaddr --setkey --save` to bake the pubkey into a tvc copy and
  return the account_id.
- `deploy_self()` — deploys with `--dst-dapp-id <own>` and **retries until
  Active** (funding-propagation race).
- `company_code()` — extracts the **code cell** (``decode stateinit`→code`),
  never the whole tvc.
- `factory_code_stale()` — compares the factory's stored code cell to the local
  one; regenerates factory (new keys) if they differ (source changed).
- `fund()` — giver leg 1: `sendCurrencyWithFlag flag:16` (VMSHELL gas); leg 2:
  `sendCurrency` (SHELL ecc floor for forward payments).
- `legacy()/self()` — address-form converters (see `wallet.md`).
- `body()` — `tvm-cli body | python3 -c '...["Message"]'`.

---

## 5. The working end-to-end demo (verified numbers)

Live on `shellnet.ackinacki.org` (last full clean run):

```
factory:  0b3cca27a299...::0b3cca27a299...            (self-rooted dapp)
company:  0b3cca27a299...::29d9be685b703173...        (factory's dapp)
founder:  4de04d6ac259...::4de04d6ac259...            (self-rooted multisig)
holder:   e313c6c09c8c...::e313c6c09c8c...            (self-rooted multisig)
```

| step | assertion | result |
|---|---|---|
| `getCompanyInfo` | name/plan recorded | ✓ `name:"NJD Ventures"` |
| `issue()` | 100 × weight 1000 | ✓ `issuedCount:100, totalWeight:100000` |
| `transfer([1], holder)` | owner changes, history appended | ✓ owner=`e313c6…`, `HistoryEntry founder→holder` |
| `deposit 10 SHELL` | index = 10e9·1e9/100000 | ✓ `deposited:1e10, dividendIndex:1e14` |
| `getClaimable(1)` | 1000·1e14/1e9 | ✓ `1e8` |
| `claim([1])` from holder | checkpoint→index, SHELL paid | ✓ `checkpoint:1e14, claimable:0`; holder ecc `0 → 1e8` |

The math is exact: 1000/100000 × 10 SHELL = **0.1 SHELL** per SIIR #1.

---

## 6. Every error encountered and how it was solved

### 6.1 `make` built nothing — "Two or more inputs are given"
`sold` compiles **one file at a time**. Passing both files failed.
**Fix:** loop over `$(TVCS)` in the Makefile.

### 6.2 Known-gosh errors while writing CompanySIIR
- **Structs/arrays with `memory` keyword** — the GOSH dialect rejects `memory`;
  use value structs and `new T[]()` allocation.
- **`require` error codes not `uint16`** — I had `uint32`. GOSH requires
  `uint16`. Fix: `uint16 constant ERR_...`.
- **`tvm.buildStateInit` deprecated** → `abi.encodeStateInit`.

### 6.3 Experience: `new` returning the address
The factory's `returns (address company)` with `company = new CompanySIIR{...}`
**compiles fine** on this `sold` — no special handling needed (I had expected a
compile error; it did not happen).

### 6.4 TvmCell introspection is gone
`dataSize()` / `empty()` don't exist in this TVM → cannot probe a cell to learn
history length. **Fix:** track counts explicitly — `_history[id][i]` +
`_historyCount[id]`.

### 6.5 Cross-Dapp VMSHELL is nullified (design bug)
v1 paid claims in VMSHELL. But `claim()` targets a wallet in **its own dapp**
while the company lives in the **factory's dapp** — every payout would be
destroyed at the boundary.
**Fix:** dividends are **SHELL (ecc id 2)**:
- deposit: `uint128 amount = uint128(msg.currencies[CURRENCY_SHELL]);`
- claim: `msg.sender.transfer({value: varuint16(0), flag: 1, currencies: {2: total}})`
This is also the future-proof path toward TIP-3/eccUSDC.

### 6.6 ABI address forms: extended vs legacy
- `tvm-cli account` / `--addr` / `--dst-dapp-id` → **extended** `dapp::acct`.
- ABI `address` JSON params (giver `dest`, `founder`, `newOwner`) → **legacy**
  `0:hex`; passing extended → `can not parse address`.
**Fix:** `legacy() { echo "0:${1##*::}"; }`.

### 6.7 `genaddr` output parsing
Output is `"raw_address": "0:…",` — my first parser kept `0:` and a trailing
comma, producing `0:<hex>,` → giver `dest` rejected, silent funding loss.
**Fix:** strip quotes/commas and the `0:` prefix.

### 6.8 Funding "succeeded" but the account doesn't exist
Giver returned `exit_code: 0`, yet querying `0000::…` said **Not found**. Why:
an externally-deployed contract is **its own Dapp root**, so a legacy
`0:<hex>` giver call lands at `<hex>::<hex>`, never in the zero-dapp.
**Fix:** query/operate on the **self-rooted** pair `RAW::RAW`.

### 6.9 `--dst-dapp-id is required`
`tvm-cli deploy` demands the destination Dapp. Passing it, the report's
`account_id` was different from `genaddr` because `genaddr` had been run
**without`--save`** (see next) — actually two distinct bugs:
- deploy without `--dst-dapp-id` → hard error;
- passing a *wrong* `--dst-dapp-id` → account that was never funded.

**Fix:** `genaddr --setkey --save` first (which makes `genaddr` agree with the
deploy math), then `deploy --dst-dapp-id <own-account_id>`.

### 6.10 Factory came up with `ownerPubkey = 0`
`onlyOwner` would reject everything. Cause: I deployed the **unbaked** tvc —
`--sign` signs the message but does **not** put the pubkey into the contract
data; only `genaddr --setkey --save` bakes it.
**Fix:** bake, then deploy. After fix: `ownerPubkey = 0x4f1d…`.

### 6.11 Company getters: "invalid opcode, code 6, exit -7"
The deployed company could not run *any* method, not even a pure getter. The
account `code_hash` (`cd5a3b10…`) didn't match my `CompanySIIR.tvc`
(`6734e711…`). Root cause: I passed **the whole `.tvc` file** as the factory's
`companyCode` parameter instead of the **code cell**. The chain installed a
code blob containing data/ABI wrapper junk → invalid opcodes.
**Fix:**
```
company_code() { tvm-cli decode stateinit --tvc CompanySIIR.tvc | python3 -c '...print(json(..)["code"])'; }
```
Pass that cell to the factory constructor. A red herring during diagnosis:
`decode stateinit` of the wrongly-stored cell reported hash `6734e711` (a tvc
starts with the code cell) — byte-wise it was wrong; comparing the **full
base64 cell** (not its hash-on-prefix) is what actually detects staleness.

### 6.12 `issue()` fails with error 101 (ERR_NOT_FOUNDER)
External calls were signed by the founder key, yet rejected. Discovery: on Acki
Nacki, **external messages arrive with `msg.sender` = an `addr_extern`**, not
`address(this)` — the classic Everscale trick `msg.sender == address(this)`
does not hold here (the ecosystem uses channel/extern addresses; AFT even
derives dedicated admin/activity channels).
**Fix:** `_isFounder` authorizes `msg.pubkey() == _founderPubkey` for external
messages and `msg.sender == _founder` for internal ones.

### 6.13 `tvm-cli body` payload parsing
The output is `{"Message": "te6ccg…"}`. Using it directly as `payload` failed:
`can not decode base64: Invalid symbol 123` (`{`). **Fix:**
`python3 -c 'print(json.load(sys.stdin)["Message"])'`.

### 6.14 Multisig `sendTransaction` aborts when forwarding SHELL
Deposit via the wallet aborted (`aborted: true`); dividends never landed. The
wallet had been funded **only with VMSHELL** (flag 16) — it held `0` SHELL
(ecc) and attached `cc {2: …}` it didn't own.
**Fix:** fund wallets twice — `sendCurrencyWithFlag(…,16)` for VMSHELL gas and
`sendCurrency` for a SHELL ecc floor. After that:
`deposited:1e10, dividendIndex:1e14`.

### 6.15 Deploy races with funding propagation
First deploy attempt sometimes missed because the giver transaction had not
landed yet. **Fix:** `deploy_self` retries (8 attempts, 3s apart, polling
`acc_type: Active`). Deploy messages are deterministic → re-sending is safe.

### 6.16 Stale company code after source edits
If `CompanySIIR.sol` changes, existing factories still deploy the *old* code.
**Fix:** `factory_code_stale()` compares the deployed factory's `getCompanyCode`
cell vs the freshly compiled code cell; mismatch ⇒ regenerate factory keys +
redeploy.

### 6.17 Replay nursing the demo
Accounts that orphaned during debugging (an uninit funded account, a pubkey-0
factory) were simply abandoned — shellnet accounts are effectively free to
leave behind; the script keys off `acc_type: Active` + code-hash comparisons,
so it never reuses a broken deployment.

### 6.18 Factory runs out of VMSHELL after deploying one company
Second `deployCompany` (the Model-B company) silently never appeared: the
factory had been funded only once and its balance had been drained by company
A's `initialValue` (`new CompanySIIR{..., value: initialValue}` is paid **from
the factory's VMSHELL**). The call exited 0; only the account query showed
"Not found". **Fix:** check the factory VMSHELL balance before each company
deploy and refill (`fund`) when below the reserve threshold.

### 6.19 Multi-line text in ABI JSON params breaks the call
Supplying the charter as a plain base64/raw string with literal newlines
inside the `deployCompany` JSON made the message malformed (tvm-cli would
reject or silently ignore it). **Fix:** JSON-encode multi-line/escapable
strings first — `python3 -c 'import json; print(json.dumps(s))'` — and embed
the result *without* extra quotes (`"charter":$CHARTER`). The returned literal
already carries its own quotes and escapes.

### 6.20 Free storage is real, but cap on-chain content anyway
Acki Nacki officially runs a freemium model ("store data without paying
fees", terabytes-scale state) and the storage-as-git-on-chain design (GOSH)
is built for enormous datasets. Storing company images + charter in the
contract works — verified byte-for-byte round-trips. Still cap every payload
(logo/deed image 1 MiB, UI 4 MiB, charter 1 MiB) so a single account can
never become pathological to mirror/emulate, and so getters stay cheap.

### 6.21 Content caps are server-side; the CLI can't push near them
Trying to exercise the 1 MiB cap with an oversized upload failed twice, on
the tooling, not the chain:
- **`Argument list too long`** — a single argv element is limited to
  `MAX_ARG_STRLEN` (128 KiB), so tvm-cli can't even receive a >128 KiB
  param; and `tvm-cli message` + `sendfile` hit the client cell-builder
  depth limit (`depth 2049 > 2048`) and then a node endpoint that expects
  a JSON body, not a raw BOC POST. The contract `require`s (factory
  202–205, company 108–111) therefore guarantee the cap, but this CLI
  cannot demonstrate the rejection. Realistic single-message content
  should stay well under ~128 KiB; larger assets belong in a chunked
  upload or a GOSH repo.

### 6.22 Python `True` vs JSON `true` (and JSON-escaped vs raw text)
Two silent comparison bugs in the charter verification:
- `json.load` returns Python bools; `print(d.get("ratified"))` prints
  `True`, not `true` — `[ "$R_RAT" = "true" ]` never matched even though
  ratification landed. **Fix:** `| tr '[:upper:]' '[:lower:]'`.
- The charter sent to the chain was JSON-escaped (`\n` literals) while the
  getter returns real newlines, so string equality failed on perfectly
  correct data. **Fix:** compare against
  `python3 -c 'import json,sys; print(json.loads(sys.argv[1]))' "$CHARTER"`.

### 6.23 ecc currencies (1 = NACKL, 2 = SHELL, 3 = eccUSDC) — verified on shellnet
The giver's ecc map is real and the treasury is currency-agnostic:
GiverV3 `sendCurrency` with `"ecc":{"1":...}` / `{"3":...}` lands in a
wallet's ecc balance, a company `depositDividends(["2","3","1"])` opens
one track per currency (index + total deposited + per-SIIR checkpoint),
and a single `claim()` pays all of them in one transfer — verified with
all three currencies at once (including NACKL, ecc id 1). Any future
token with a new ecc id works with zero protocol changes.

### 6.24 A wallet bounces a send it can't cover — top up the sender
The founder wallet creazily "deposited" 10 SHELL + 5000 USDC into the
company and it never landed, with no error. Cause: the wallet had spent
its SHELL on an earlier demo run and held only 9 SHELL — `sendTransaction`
with `cc: {2: 1e10, 3: 5e12}` bounces at the **wallet**, before reaching
the company. **Fix:** top up the *sender's* ecc balances (giver
`sendCurrency`, both currencies) before the deposit; check
`ecc_balance.{2,.3}` rather than assuming.

### 6.25 `tvm-cli` exits non-zero on an expected rejection — kill `pipefail`
Under `set -euo pipefail`, the charter's "second ratification (expect
exit 112)" check aborted the whole run: `tvm-cli callx` exits non-zero on
an aborted message and pipefail propagates it. **Fix:** `|| true` at the
end of any call whose non-zero exit is the *expected* result.

### 6.26 Mirror-node reads flake — poll, don't trust single reads
`tvm-cli run` intermittently returns `Resource not found` /
`Invalid dapp_id` on freshly-processed accounts. `set -e` turned one bad
read into a run abort. **Fix:** retry-tolerant pollers (`for attempt...;
sleep 2`) around every account read that must succeed, parse with
`.get(...)` defaults, and only `exit 1` after the whole retry window.

### 6.27 Python int vs JSON string in the probe — silent "never landed"
`div_dep 3` probed `getDividendCurrencies` with `ids.index(3)` — but
tvm-cli returns ids as JSON **strings** (`"3"`), so the lookup raised
ValueError and the probe printed `0` forever: the deposit poll then
declared "[fail] deposit never landed" even though the deposit landed
fine. **Fix:** compare string-to-string (`ids.index('$1')`).

### 6.28 A wallet can be too poor to send its own claim
The holder's VMSHELL balance had decayed to 822M nano — below the 1e9
`sendTransaction` value plus fees — so the claim message was
`aborted: True` and nothing was ever paid, with no error anywhere else.
**Fix:** top up the sender wallet's VMSHELL gas (`fund` with flag 16)
before claiming, and make the claim poll fail hard if pending never
reaches zero.

### 6.29 Concurrent script runs double-deposit and interleave logs
An aborted run's shell kept executing and raced the next run: two
deposits landed (amounts doubled) and both runs wrote into the same log
file. **Fix:** don't start a new run while another is alive; the deposit
poll now keyed on the per-currency deposited amount makes double-landing
visible.

### 6.30 Gateway zeroed every holder count and weight (v2)
`gateway.as_int` did `int(v, 0)` — a TypeError on native Python ints,
which the mirror legitimately returns for `_segments()` bounds. Every
holder row rendered 0/0 while the raw state was correct. Caught by the
fixture-backed gateway test suite (`as_int` on an int, not a str).
**Fix:** `int(v) if isinstance(v, int) else int(v, 0)`.

### 6.31 Legacy fallback returned empty rows for old v1 companies
`mirror._resolve` only understood the v2 compact `_siirs` overrides
(label/metadata pairs) and treated *materialized* v1 deed records as
garbage, so the legacy gateway fallback served empty registers for
contracts deployed before v2. **Fix:** `_siirs` entries with ≥6 elements
are decoded as `[weight, owner, createdAt, round, label, metadataUri]`.

### 6.32 `deploy.sh: OWNER: unbound variable` (line 295)
A prior edit had collapsed the newline between an `echo` banner and the
following assignment — `…=="OWNER=$(…)"` — making `OWNER` parse as an
assignment inside the echo. Under `set -u` the script died mid-run.
**Fix:** restore the newline between the banner and the assignment.

### 6.33 `deployCompany` from the script never activated the company
The script's attempt reported `[fail] company not active after 60s`
even though the message itself was fine (the gzip UI path worked — the
bundle was stored). **Fix:** called `deployCompany` directly via
`tvm-cli callx` with the same payload (deterministic state-init → the
address is identical either way); company came up Active.

---

## 7. Why these components exist (map of responsibilities)

| piece | does | why it exists |
|---|---|---|
| `SIIRFactory` | deploys companies; stores company code + owner pubkey | one place companies come from; inert after deploy |
| `CompanySIIR` | the register: issue / transfer / deposit / claim / getters | the shareholder record; immutable identity for life |
| `_companyCode` (cell) | the only code factory may embed | so all companies share one verified, frozen implementation |
| statics `_factory/_founder/_founderPubkey` | bake identity into the company address | address = promise of immutability; verifiable forever |
| `SCALE=1e9` | fixed-point for the dividend index | non-integer per-SIIR claims (decimals = SHELL's) |
| `getFingerprint` | `hash(weight, createdAt, round, label, metadataUri)` | auditable deed identity, never changes |
| ecc currencies (ids 1, 2, 3, …) | dividend media | any currency the network or a wallet's dapp creates — payout token is a parameter, not an accounting change |
| `scripts/deploy.sh` | one-shot reproducible shellnet demo | proves the whole contract stack, replays anytime |
| `scripts/mirror.py` | v2 lazy mirror: decodes raw account state and derives every deed from plans + segments + overrides (`_resolve` mirrors the contract 1:1) | browsers/APIs must read per-id data without the chain iterating 10B ids |
| `SIIRMarketplace` | range-based listings (sell a range, buy a range) | secondary market with the same O(1) compactness as the register |
| `scripts/gateway.py` | serves on-chain UI/images/charter over HTTP, plus the SIIR explorer (register, holders, plans, treasury, history, search) | browsers need URL-shaped reads; content stays on-chain |

---

## 8. v2.0.0 — the lazy cap table (SIIRs for 10-billion-share registers)

### 8.1 The problem

v1 stored one materialized `SIIR` record per id. That caps out hard:
a 10-billion-share company would need 10 billion on-chain records —
impossible in deploy gas, state size, and getter iteration. A cap
table is a *range* ("ids 1..10B belong to Alice"), not a list of
records, so the register is stored as ranges and every deed is
**derived on demand** — the chain holds a compact spec, and anyone
(mirror, explorer, wallet) can materialize any single id or any page
in O(1).

### 8.2 The design (nothing per-id is stored)

Three compact structures replace the per-id map:

| structure | holds | size |
|---|---|---|
| `_plans[]` + `_planStartId[]`/`_planEndId[]` | one row per *plan*: `count`, `weight`, `label`, `issued`, `issuedAt` — every id in the range defaults to these | O(plans) |
| `_segments[]` | ownership ranges `[start, end, owner]` — one segment per contiguous same-owner block | O(segments) |
| `_siirs` override map | only per-id *deviations* (label/metadata) | O(overrides) |

- `issue()` appends one segment and bumps counters — **O(1) no matter
  how large the plan** (genesis of 10B ids = 1 segment row).
- `transfer(ids)` / `transferRange(start, end)` call `_splitSegmentFor`
  which replaces the containing segment with ≤3 pieces (left remnant /
  moved range / right remnant; empty pieces skipped). History and
  events stay per-id but sparse.
- `getSIIRsOf` returns **compact hex start–end pairs**, not id lists.
- Claim math is unchanged: weight comes from the plan, checkpoint per
  id; nothing else needs per-id state.
- The resolution rule (contract `_resolve`, mirrored 1:1 off-chain):
  plan defaults → override label/metadata → owning segment's owner.
- A third contract, `SIIRMarketplace`, joined the suite: listings are
  also range-based (sell a range, buy a range).

### 8.3 The verification ladder (how we proved it)

Three independent suites, all fixture-backed (no chain, no tvm-cli):

1. **Parity suites** — the same hand-built fixtures fed to the JS
   mirror and the Python mirror; both must agree with each other and
   with what the contract computes: 24/24 + 24/24.
2. **Gateway harness** — real `gateway.py` functions over fixture
   mirror state (pattern: `MirrorState.__new__`, stubbed
   `gateway.mirror_state`/`tvm_cli`, `gateway.CACHE` reset between
   fixtures): 31/31 — register lazy rows + pagination + total, holder
   counts/weights, holder ranges/claimable, `getSIIRsOf` hex pairs,
   legacy v1 fallback, gzip/plain data URIs, claim math.
3. **DOM smoke** — the real static explorer pages executed in a VM
   with injected lazy fixtures: 33/33 — factory directory, company
   overview, register (range rows + override rows), holders, holder
   page, derived per-SIIR pages, marketplace.

The suites earned their keep immediately: §6.30 (as_int zeroing
holder data) and §6.31 (legacy fallback) were both caught by them.

### 8.4 Live deployment (FORCE redeploy to v2.0.0, shellnet)

```
dapp-id:    4e9a5b9c820eacd5e5be6bf8d8ee62b5a55c706405280f937df67a32a2bd3c0b
factory:    <dapp-id>::4e9a5b9c820eacd5e5be6bf8d8ee62b5a55c706405280f937df67a32a2bd3c0b
marketplace:<dapp-id>::9e8c960079e2a9a6133bdfb758ad09b18f0b0e5042a235223583ef2df5c3d745
company:    <dapp-id>::5f0777ceb141780eb86e7fa96c6214d4a327a0572e6498dfb4951ea31e9f0fe5
rounds:     <dapp-id>::fee2ebf7f0614397738c32df1f968d07e0a77252b212f17599f45d2209a2f577
founder:    c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb::<same>
holder:     0f077a5e0f4630b9696db80a77b357ab576773d0a278590a22408d1c89366caa::<same>
factory ownerPubkey: 0xb7df23e9a73343f1fc3a11e15ae3f6bf227b9df955f2da558c96904021e92b8b
founder pubkey:      0x4af1476b083267020a5b70e179269d24223e33869f32450fb91537fecbc60235
```

**v2.1.0 (governance & dissolution, §8.6) live redeploy** — the last full
`FORCE` run (`DEMO_DISSOLUTION=1 DEMO_GOVERNANCE=1 GOV_ENABLED=true
GOV_QUORUM=5`) ended with the demo company dissolved by vote, so the
current live demo company is the *rounds* one:

```
dapp-id:    4e8739f0f0d270e0dbc2710cff4d6b829c31fafedbad243bff3afbd766ed8a84
factory:    <dapp-id>::4e8739f0f0d270e0dbc2710cff4d6b829c31fafedbad243bff3afbd766ed8a84
marketplace:<dapp-id>::5c49a1d711134b774f0e40062859415ed691bfc9736ff0cfb69ce172a888c849
company:    <dapp-id>::4a87745e212b8dcfd0830a2dc185d47dff044b1861b632874a0436d0a03e047e (dissolved by vote)
rounds:     <dapp-id>::b71a87a48257fe21c45411f442483e1749341f2ec65b582452bdc650d342b4d4 (operating)
founder:    c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb::<same>
holder:     0f077a5e0f4630b9696db80a77b357ab576773d0a278590a22408d1c89366caa::<same>
factory ownerPubkey: 0xb7df23e9a73343f1fc3a11e15ae3f6bf227b9df955f2da558c96904021e92b8b
founder pubkey:      0x4af1476b083267020a5b70e179269d24223e33869f32450fb91537fecbc60235
```

The v2.1.0 run verified all 14 steps green (24/24 checks): the
governance-enabled company rejected a founder `dissolveCompany` before
quorum (`ERR_QUORUM_NOT_MET`), rejected the zero-weight holder's vote
(`ERR_NOT_OWNER`), dissolved instantly once the founder's weighted vote
(100000 of 100000 total, quorum 5‰) landed, accepted exactly one final
distribution during the 30-day grace, and blocked `finalizeDissolution`
before the grace ended. The governance-disabled variant (run before it)
proved the founder-only path: frozen register, `voteDissolve` rejected,
founder `dissolveCompany`, one final deposit, `finalize` still blocked.
`getGovernance` is mirrored from state (see §8.6 note).

**10B-scale under v2.1.0 (live, current)** — the current shellnet
deployment: `FORCE=1 PLAN_COUNT=10000000000` on the v2.1.0 stack,
13/13 steps green with the 10B plan (the full 13-step lifecycle —
genesis, deposits, consolidated claim, marketplace settle — at the
10^10 scale, no step-14 demo so the company stays operating). The
explorer index (gateway) reads this factory's registry directly:

```
dapp-id:    82a2ff688d97c434697602f8dbe38c4d0e582a4f5e4f5d936b29589c422791e6
factory:    <dapp-id>::82a2ff688d97c434697602f8dbe38c4d0e582a4f5e4f5d936b29589c422791e6
marketplace:<dapp-id>::1c67df9ce1e21711b6cb10118170cfce5d6942b8a28365e3a691f057a1bb4144
company:    <dapp-id>::6890748cdb02ed4c1ac5f43b52c4e9048f60567fe0cbfbe8124babb37f1096bd  (10B SIIRs, operating)
rounds:     <dapp-id>::3d74a393d63c1d75a464e6298e64e7a261937e5e8847fefd80fe95353638c538
founder:    c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb::<same>
holder:     0f077a5e0f4630b9696db80a77b357ab576773d0a278590a22408d1c89366caa::<same>
factory ownerPubkey: 0xb7df23e9a73343f1fc3a11e15ae3f6bf227b9df955f2da558c96904021e92b8b
founder pubkey:      0x4af1476b083267020a5b70e179269d24223e33869f32450fb91537fecbc60235
```

Verification on the live 10B company: genesis `issuedCount:10000000000,
totalWeight:10000000000000, nextId:0x2540be401` as one segment row;
`getSIIR` resolves ids 1 / 5,000,000,000 / 10,000,000,000 off one plan
row; `getBalanceOf` counts 10B from one segment; one `transferRange`
moved all 10B ids to the holder in one record; `getGovernance` mirror
reads `totalWeight=10000000000000`, operating, founder-only mode.

| step | assertion | result |
|---|---|---|
| factory | ver 2.0.0, company code cell = fresh compile | ✓ |
| deployCompany | company Active, ver fields set | ✓ |
| UI bundle | >46k message budget → gzip path | ✓ 15,329 B base64 `;base64,gz,` stored on-chain, byte-exact round-trip (deterministic gzip: `mtime=0`) |
| issue genesis | 100 × weight 1000 | ✓ `issuedCount:100, totalWeight:100000` |
| segments | one range `[1..0x64 → founder]` | ✓ |
| deposits | ecc 2/3/1 via founder multisig | ✓ |
| claimable(1) | weight·index/1e9 | ✓ |
| transfer #1 | founder → holder | ✓ (deed escrow → holder, step 7) |
| claim | 3 currencies, one consolidated `transfer{value:1g,flag:1,cc2}` | ✓ holder ecc = `{"1":60000000,"2":114600000000,"3":300000000000}` |
| rounds company | Model-B `issue` to 100 via holder | ✓ Active, extra issue → supply-exceeded exit code |
| charter | immutable text, founder-key ratification, stable fingerprint | ✓ |
| marketplace | escrow → list 5 SHELL → founder bid → `acceptBid` | ✓ deed `#1 → 0:c4d173…` (bidder), listing closed |

### 8.5 The VMSHELL reserve trap (why acceptBid aborted)

The marketplace settle failed twice with `action failed: error_code=37`
(insufficient balance) even though the account's GraphQL `balance_delta`
showed ~41e9 credits per inbound message. Root cause — this chain's
gram accounting is **reserve-based**:

- An account can only *send* grams it holds as VMSHELL reserve, granted
  by the giver's `sendCurrencyWithFlag … flag:16` (`fund()` in
  `deploy.sh`) or by a deploy message's `value`.
- Wallet `flags:1` messages carrying grams **do not** replenish the
  receiving contract's reserve — the ~41e9 `balance_delta` is the
  carried SHELL-ecc, not spendable grams.
- The factory's constructor deploys the marketplace with only ~1e9
  grams of reserve; list/bid fees ate it down to 974,620,000, so
  `acceptBid` (which must send 2×1e9: deed to the buyer + price to the
  seller) died at the action phase and the executor zeroed the account.
- The step-2 `fund "$MARKET" …` was guarded by `if ! Active`, but the
  marketplace is always Active (deployed by the factory constructor) —
  so the top-up never ran. Fixed: unconditional reserve top-up
  (`fund "$MARKET" 40000000000`, flag16) right after step 2.

Lesson: on this network, **senders** must be reserve-funded before any
cross-dapp gram transfer; the deploy script now does so for factory,
wallets, and the marketplace, and step 13e verifies the settlement
(deed → bidder, listing `active:false`) with a hard `[fail]` + exit 1.

Two more funding lessons from the 10B proof runs:

- **A wallet `flag:1` send of 3e9 grams costs ~12.9e9 net** (the action
  phase burns value + forward fees from the reserve). A single 5e10
  top-up covers only three of the holder's four sends (claim, escrow,
  list, acceptBid) — the fourth aborts with action `error_code=37,
  no_funds:true`. The script now refills the holder to 1.2e11 at step 9
  and re-checks before step 13a (`topup` helper).
- **Every contract-initiated gram send needs reserve** — including the
  founder's `transferRange` in step 5b and the deposit in step 8; the
  `topup` helper runs before each.

Note: the old §8.5 "transfer aborts with exit code 50" is resolved —
that abort was the 0-gram claim payout bouncing at the receiver for
lack of forward fee; the claim now pays `value:1e9, flag:1` in one
consolidated message (verified delivering all three currencies).

### 8.6 Governance & dissolution (v2.1.0) and two tooling lessons

**v2.1.0 contract surface** (spec: `SIIR.md` §Governance, §Dissolution):
constructor gains `governanceEnabled, quorumPermille (0–1000),
dissolutionRule (0 treasury→founder, 1 charity, 2 DAO, 3 burn),
dissolutionDest` (must be nonzero for rules 1–2). `voteDissolve()` —
one weighted vote per wallet (`_weightOf` sums plan weight over owned
segments), zero-weight votes rejected (`ERR_NOT_OWNER`), quorum
`votes*1000 >= totalWeight*quorumPermille` auto-dissolves.
`dissolveCompany()` — founder-key, requires the quorum when governance
is enabled. `finalizeDissolution()` — founder-key, only after the
30-day grace; sweeps every dividend currency to the dissolution dest
(TREASURY → founder; BURN → address(0), no send). Guards: the register
is frozen once dissolved (`issue/transfer/transferRange` →
`ERR_REGISTER_FROZEN`), one final `depositDividends` is allowed during
grace (`_finalDeposited`), claims are blocked once finalized, and
deposits are blocked after finalization. Readbacks:
`getGovernance()` (11 fields incl. computed `graceEnd`) and
`getVoteInfo(owner)`.

**tvm-cli 3.0.0 cannot decode `getGovernance`.** The run succeeds but
tvm-cli's decoder rejects the response (its getter-id computation
includes the output types, and the response body is
`[0xb7072865 marker][11-tuple]` with the tuple tail in a ref — the
decoder chokes where it tolerates every other getter). The response
itself decodes cleanly with the mirror's C4-style tuple loader (all 11
values verified at offset 32). Workaround: `scripts/gov_state.py`
reads the governance state straight from the mirror node (it drives
`deploy.sh` step 4 + step 14 and the gateway's company page + 
`/company/<addr>/governance`; the gateway refuses the tvm-cli fallback
for `getGovernance` since it can never succeed).

**Deterministic funding of the step-7 transfer.** A `FORCE` run
failed step 9 ("claim never settled") because step 7's transfer of
SIIR #1 to the holder had silently bounced: the founder's VMSHELL
reserve had drifted under the ~3.9e9 needed (tx fees vary per round),
and step 7 had neither a `topup` nor a landing check — the failure
only surfaced two steps later at the claim. Step 7 now runs
`topup "$FOUNDER" 9000000000 "founder"` first and hard-fails with a
`[fail]` + exit if the ownership didn't change.

---

## 9. Current status and next steps

**Done (verified on shellnet):** spec (`SIIR.md`), README, contracts
(`SIIRFactory`, `CompanySIIR`), `Makefile`, `scripts/deploy.sh`, docs
(`giver3.md`, `wallet.md`, `project.md`, `usage.md`, `gateway.md`), full
dividend-paying lifecycle, the Model-B (rounds) issuance path, on-chain
company content: logo + deed image + UI bundle (base64 data URIs,
size-capped, byte-exact round-trips), the **founder's charter**
(immutable text, founder-key ratification, stable fingerprint), and a
**currency-agnostic treasury**: dividends are paid in *any* ecc currency
the network has (SHELL=2, eccUSDC=3, NACKL=1, or a token created after
deployment) — each currency gets its own track (index, total deposited,
per-SIIR checkpoint), one `depositDividends(currencyIds)` credits them,
one `claim(ids)` settles them all. Verified live byte-for-byte across
three currencies in a single claim (a 1000-weight SIIR of 100000 total
collects 0.1 SHELL + 50 eccUSDC + 0.01 NACKL per deposit round).
All servable through the on-chain content gateway (`scripts/gateway.py`).
The gateway also ships an **explorer**: paginated SIIR register, holder
lookup (address, balance, claimable), plans, payout tracks, per-SIIR
fingerprint + history, and free-text/address search — everything read
live from the contracts (see `docs/gateway.md`).

**v2.0.0 (lazy cap table, §8):** the register became fully range-derived
(O(1) issuance at any size, compact ownership segments, sparse overrides)
and is re-verified end-to-end: 24/24 JS + 24/24 Python parity, 31/31
gateway, 33/33 DOM smoke. Redeployed live on shellnet (§8.4): factory
ver 2.0.0, company Active, genesis issued, three-currency deposits
landed, gzip UI bundle stored on-chain, and the full demo lifecycle now
passes **steps 1–13**, including the marketplace escrow → list → bid →
`acceptBid` settle (deed → bidder, listing closed, verified in step
13e). The last blockers were VMSHELL-reserve issues (§8.5): contract
senders need flag-16 reserve top-ups before cross-dapp gram sends, and
a wallet `flag:1` 3e9 send costs ~12.9e9 net — `fund`/`topup` calls now
run unconditionally before every sender.

**10B-scale proof (live, `PLAN_COUNT=10000000000`):** the genesis issue
of **10,000,000,000 SIIRs** lands as a *single segment row* —
`issuedCount:10000000000, totalWeight:10000000000000, nextId:0x2540be401`;
`getSIIR` resolves id 1 / 5,000,000,000 / 10,000,000,000 off one plan
row; `getBalanceOf` counts 10B from one segment; one `transferRange`
moves all 10B ids to the holder in one record (segments: one row, owner
swapped) with per-id history event. The full 13-step lifecycle then
passed with the 10B plan, including deposits (indices 1e6/5e8/1e5),
the consolidated claim (payouts round to 1/500/0 nano — zero-amount
currencies are skipped by design), and the marketplace settle. **The
current shellnet deployment is a fresh 10B run on the v2.1.0 stack**
(§8.4): factory `82a2ff68…`, 10B company `…::6890748c…` operating, in
the registry and browsable from the gateway index.

**Next:** governance & dissolution safeguards, and wiring the
explorer's live marketplace views against the §8.4 addresses.

**Done since:** governance & dissolution (v2.1.0) shipped and verified
live: founder- and vote-driven dissolution, frozen register, one final
distribution in grace, founder-key finalize after 30 days, and
immutable unclaimed-treasury rules — the full 14-step demo is green in
both governance modes (§8.4, §8.6). The explorer and gateway now show
the governance card and a `/company/<addr>/governance` endpoint read
from mirror state, and `deploy.sh` step 14 exercises the whole
lifecycle with hard assertions.