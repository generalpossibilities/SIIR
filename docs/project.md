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
| `scripts/gateway.py` | serves on-chain UI/images/charter over HTTP | browsers need URL-shaped reads; content stays on-chain |

---

## 8. Current status and next steps

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

**Next:** wallet integration (claim button, deed view);
governance & dissolution safeguards; marketplace hooks.