# TODO

Backlog for the SIIR demo project. Checked items are done and committed
(see `git log`). Open items are ordered by priority.

## Open

### 1. Gateway hardening: mirror-node client without tvm-cli (parked)
Replace the per-getter `tvm-cli run` spawns in `scripts/gateway.py` with a
fast in-process client. State of the work in `scripts/mirror.py`:

- Mirror node GraphQL works: `blockchain.account(dapp_id, account_id)` returns
  `info.data` = the contract persistent-state BOC (one HTTP call per company).
- Blocked on decoding the BOC: the header is NOT standard te6. Saved blob at
  `/tmp/opencode/acct.boc` (2470 bytes), header bytes at offset 4:
  `01 02 41 01 00 09 9a 00 01 93 00 ...` — no known varuint scheme
  (count-prefix, LEB128 bit7, bit6) produces sane counts from it.
- Observed cell-content layout (empirically verified, but unexplained):
  string frame = `[flag:1][len:16]`; flag=0 → data bytes = len/2
  (`00 0e` + "Genesis" = 7 chars; `00 18` + "NJD Ventures" = 12 chars);
  flag=1 → `01 fe` = 254 = 127-byte chunk, more chunks follow
  (`01 fe` repeats at 127-byte boundaries, e.g. charter at 917..1651).
- Next steps when resumed:
  1. Figure out the header/descriptor variant (compare with `cell_hash` /
     hashes-included layout; dump the SDK's descriptor math from
     evercloud/ever-sdk source `boc.cpp`; or verify against a te6 file
     produced by local `tvm-cli dump`).
  2. Finish `MirrorState` (getters already written), verify outputs against
     `tvm-cli run` results for both companies, wire into `gateway.py`
     (`run_getter`, `fetch_rows`) with tvm-cli as fallback, regression-test
     the explorer, update `docs/gateway.md`, commit.
- Fallback idea if the format stays opaque: keep tvm-cli but cache getter
  results keyed by the account `data_hash` (cheap GraphQL field), re-running
  only when state changes.

### 2. Governance & dissolution safeguards
- Grant/revoke flows, quorum enforcement, `dissolveCompany` path, owner-side
  guarantees (see `contracts/CompanySIIR.sol`).

### 3. Marketplace hooks
- Listing, offers, and settlement primitives on top of `transfer` +
  `claimDividends`.

## Done
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
