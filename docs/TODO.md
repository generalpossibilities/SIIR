# TODO

Backlog for the SIIR project. Checked items are done and committed
(see `git log`). Open items are ordered by priority.

Project-end goals (per the founder):
- **Independence**: the protocol must run without a paid server — reads from
  the public mirror node, content from the chain, no tvm-cli dependency.
- **UI deployability**: everything currently done from the CLI
  (`scripts/deploy.sh`) must be reachable from a browser.

## Open

### 1. Finish the mirror-node gateway (in progress)
State of the work in `scripts/mirror.py`:
- [x] One HTTP call to the public mirror node GraphQL
  (`blockchain.account(info.data)`) replaces per-getter `tvm-cli run`.
- [x] Full one-pass state decode: BOC (magic/descriptor/find_tag/big cells),
  C4 break chain per `DecodePositionAbiV2`, HmLabel walk, compiler
  dict-value rule (inline vs value-in-ref, `12 + keyLen + maxBits < 1023`),
  nested maps (`_checkpoint`, `_history`), tuple breaks, `uint32[]`-before-
  `uint` decode order. Verified offline and live against `tvm-cli` on
  shellnet.
- [x] `cell_hash` matches the SDK descriptor math (`calc_d1`/`calc_d2`,
  marker-bit padding).
- [x] **`getFingerprint` / `getCharterFingerprint` parity** — SOLVED:
  `cell_hash` needed child depths before hashes (all depths, then all hashes,
  per tvm-sdk data_cell.rs); strings in `abi.encode` tuples are bare raw-byte
  refs (no length prefix); the charter is a 127-byte cell chain whose root is
  hashed. Verified live: fingerprint(1/2/100) = `0x1163cfaf…`, charter fp =
  `0x73075fe3…` all match tvm-cli exactly.
- [x] `MirrorState` wired into `scripts/gateway.py`: `run_getter` serves all
  17 getters from the mirror with tvm-cli fallback; fixed `claimable_of`
  (str-vs-int currency keys) and `content_info` (string byte length, not
  decoded base64). 17/17 live parity, HTTP regression green (register,
  holders, plans, treasury, history, search, claim page, deed, logo, app).
- [ ] Update `docs/shellnet-decoding.md` with the verified layout rules and
  `docs/gateway.md` with the mirror mode; commit.

### 2. Independence: zero paid server, zero tvm-cli
- [x] **Static client-side explorer** (`static/`): plain JS port of the whole
  mirror decode (`core.js` — BOC, dicts, cell breaks, cell_hash with
  `crypto.subtle`, BigInt math) + single-page app (`index.html`, `app.js`).
  Verified byte-identical to the Python client (17/17 parity checks) and
  live against shellnet; renders company/register/holders/SIIR/holder pages
  and fingerprints from **`file://` with no server process** (CORS is open
  on the mirror). Served by the gateway at `/static/`.
- [x] **On-chain UI embedding path**: `static/bundle.py` inlines the explorer
  into a single self-contained HTML (~40 KB) and `--emit`s it as a
  `data:text/html;base64,…`; `deploy.sh` now ships that as the `CompanySIIR`
  UI unit (`_ui`, 4 MiB cap; the gateway already serves a stored `_ui`
  verbatim at `/company/<addr>/` and `/app`). The bundle decodes through
  `decode_data_uri` in the gateway.
- [ ] Remove the tvm-cli dependency from `gateway.py` entirely (reads via
  mirror; the only tvm-cli uses left are wallet writes — see item 3).
- [ ] Ship the explorer to a free static host (GitHub Pages) and/or embed it
  as the on-chain UI bundle via the content gateway.
- [ ] Prove it from a clean machine with only a browser: register, holders,
  plans, treasury, history, claims (amounts; signing is item 3), deed all
  work with no server process.

### 3. Everything deployable from the UI
Replace the CLI lifecycle (`scripts/deploy.sh`) with browser flows:
- [ ] **Company creation**: founder form (name, description, website, plans,
  issuance model, founder pubkey/address) → factory `deployCompany` →
  status page.
- [ ] **Funding**: giver faucet calls (VMSHELL gas leg + SHELL ecc leg) from
  the UI for factory/company/wallet accounts.
- [ ] **Issue**: founder button per plan; **Transfer**: owner-initiated
  SIIR transfer; **Deposit dividends**: currency+amount form;
  **Claim**: existing claim flow, extended to any owned SIIR.
- [ ] **Charter**: upload, founder-key ratification, fingerprint display.
- [ ] Signing model decision: browser wallet (AFT/extended-wallet connect,
  pubkey auth) vs. server-side key custody behind the UI. Decide and
  implement; keep `scripts/.work/*.keys.json` for local dev.
- [ ] Verify each step live on shellnet; explorer must reflect UI actions
  instantly (mirror read-back).

### 4. Governance & dissolution safeguards
- [ ] Grant/revoke flows, quorum enforcement, `dissolveCompany` path,
  owner-side guarantees (see `contracts/CompanySIIR.sol`).

### 5. Marketplace hooks
- [ ] Listing, offers, and settlement primitives on top of `transfer` +
  `claimDividends`.

## Done
- Mirror decode work (item 1 top block): BOC parsing, C4 breaks, HmLabel,
  dict value-in-ref, nested maps, tuple decode, `[]`-vs-`uint` ordering,
  cell hash descriptor math — all verified offline and against live
  tvm-cli getters on shellnet (see `git log`, mirror.py docstring).
- `941f119` Wallet integration in gateway: `GET/POST /claim` (signs with
  `scripts/.work/holder.keys.json`, polls until settled) + printable deed card
  at `/siir/<id>/deed`; live-tested on shellnet incl. error paths. This task
  created this TODO file.
- `ffdb9fd` Explorer on the gateway: register, holders, plans, treasury,
  history, search.
- `0fd1654` Currency-agnostic dividends (NACKL+SHELL+USDC in one claim).
- `f966079` Dual-track treasury (SHELL + eccUSDC).
- `4cb2362` On-chain content gateway (UI, images, charter, info).
- `df31b64` On-chain company content (logo, deed image, UI) + charter.
