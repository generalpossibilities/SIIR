# SIIR content gateway — serving the on-chain UI and images

`scripts/gateway.py` is a zero-dependency HTTP server that reads a
`CompanySIIR` contract through the Acki Nacki mirror node and serves the
**on-chain content** to a browser. Everything it renders is stored in the
immutable company contract — no external hosting, no files.

## Why it exists

The company supplies its logo, deed image, optional UI bundle, and charter
at `deployCompany`; they live on-chain (free storage). A browser needs an
HTTP face, so the gateway translates getter calls into web responses:

| route | serves |
|---|---|
| `GET /` | marketplace landing — escrow account card (one-click copy, long-press reveals the full address), NACKL/SHELL/eccUSDC token filter, ask listings + buy offers from the marketplace contract; companies are reachable only via search |
| `GET /search?q=…` | company search against the factory registry (name or address); SIIRs are reachable only through their company |
| `GET /company/<dapp_id>::<account_id>/` | company page — the stored UI bundle if present, otherwise a generated showcase (logo, deed, info, charter + ratification) |
| `GET /company/<addr>/app` | the raw stored UI bundle (`text/html`) |
| `GET /company/<addr>/logo` | on-chain company logo (e.g. `image/svg+xml`) |
| `GET /company/<addr>/deed` | on-chain SIIR deed card image |
| `GET /company/<addr>/info` | `getCompanyInfo` as JSON |
| `GET /company/<addr>/charter` | charter text + `ratified` flag + fingerprint as JSON |
| `GET /company/<addr>/explore` | explorer page: search, SIIR register (paginated), payout tracks, issuance plans |
| `GET /company/<addr>/full` | `getCompanyInfo` + treasury + plans + content sizes + version as JSON |
| `GET /company/<addr>/register.json` | paginated SIIR register: `?offset=&limit=` (default offset 0, limit 25, max 100) |
| `GET /company/<addr>/holders.json` | holders aggregated from the register (`{owner: {count, weight}}`); full scan, so large registers are capped by a time budget (`truncated`) |
| `GET /company/<addr>/holder/<owner>` | holder page (SIIRs + balance + claimable). Accepts `64-hex`, `0:64-hex`, or `dapp_id::account_id`; the same data is on `.../holder.json/<owner>` |
| `GET /company/<addr>/siir/<id>` | SIIR page (weight, owner, round, label, metadata, fingerprint, claimable, transfer history); same data on `.../siir.json/<id>` — includes the SVG **seal** (protocol-fixed 200×264 stamp; the plan's `image` fills a centered window without cropping, else a tiered fallback card), identical to the in-browser renderer |
| `GET /company/<addr>/siir/<id>/deed` | printable deed card: company + logo, holder, weight, claimable, fingerprint, provenance |
| `GET /company/<addr>/claim` | read-only claim page: pending amounts + how to sign from your own wallet. With `--writes`: the server-side claim form for the gateway's wallet |
| `POST /company/<addr>/claim` | **disabled by default (403)** — the gateway is read-only per the user-paid gas model; no server-side keys in production. With `--writes` (dev networks only, rate-limited 10/min/IP): sends `claim(ids)` signed by the gateway wallet (JSON body `{"ids":["1"]}` or a form `ids=1&ids=2`; JSON reply when `Accept: application/json`) |
| `POST /factory/<addr>/deploy` | **disabled by default (403)**, same model as `/claim`. With `--writes`: deploys a new company through the factory, signed by the gateway wallet (JSON body `{"name", "description", "website", "metadataUri", "founderPubkey", "issuanceModel", "plans":[{count,weight,label,issued,image}], "logoImage", "siirImage", "ui", "charter", "initialValue", "governanceEnabled", "quorumPermille", "dissolutionRule", "dissolutionDest"}`; plan image + logo/deed ≤ 1 MiB, UI ≤ 4 MiB, charter ≤ 1 MiB). Sends `deployCompany` with the deploy fuel (26e9 SHELL + 3e9 VMSHELL), then polls `getCompanyInfo` (~30 s) and returns `{company, txid, active, name, founder}`. `deployCompany` is `onlyOwnerOrFounder` — the message must reach the **factory**, not the predicted child address. A non-empty `founderPubkey` derives a unique company address; leaving it blank defaults to the gateway wallet + its key (reuse collides with existing companies and the factory refuses) |
| `GET /factory/<addr>/deploy` | **with `--writes` only (403 otherwise):** the browser deploy form page — fields for name/description/website/model/plans/founder/pubkey/governance; POSTs JSON to the same URL, renders the result. Signing is server-side (the gateway wallet's key never leaves the server) |
| `GET /company/<addr>/plans` | `getPlans` as JSON |
| `GET /company/<addr>/treasury` | `getDividendCurrencies` as JSON |
| `GET /company/<addr>/history/<id>` | `getHistory` entries as JSON |
| `GET /company/<addr>/search?q=...` | if `q` is an owner address -> holder page; otherwise substring scan of labels, metadata URIs and owner addresses. The same data is on `.../search.json?q=` |
| `GET /factory/` · `GET /factory/<addr>/` | factory index + directory (registry decoded from the factory contract); `.../companies.json` for the JSON form |
| `GET /marketplace/<addr>/` | marketplace page (escrow card, token filters, listings + bids); `.../listings.json` and `.../bids.json` for the JSON forms |
| `GET /marketplace/<addr>/stats.json` | per-currency live order-book summary: best bid/ask, mark (mid, or the live side when only one exists), spread, open bid/ask counts + values. No last-trade/volume (Acki Nacki keeps no on-chain trade history) — valuation is mark-only by design |
| `GET /company/<addr>/analytics.json` | issuance, per-currency treasury tracks with `dividendsPer1000Weight = 1000·index/1e9`, current marks from the factory's marketplace, charter fingerprint, contract version; `.../statement` for the human page |
| `GET /company/<addr>/holder/<owner>/statement.csv` | per-holder statement for spreadsheets (ids with weight, per-currency claimable, bounded history). Ranges are sampled (first 50 ids per range + a range row) so 10B-id registers stay bounded |
| `GET /company/<addr>/plans` | `getPlans` as JSON |

## Run

```bash
python3 scripts/gateway.py --port 8000            # shellnet by default; read-only
python3 scripts/gateway.py --port 8000 --net <other-net> --debug
python3 scripts/gateway.py --port 8000 --writes   # dev networks only: enable POST /claim (rate-limited)
python3 scripts/gateway.py --port 8000 --multisig-abi <path-to-UpdateCustodianMultisigWallet.abi.json>
```

**Gas & signing model**: transactions are signed by the user's own wallet and
paid for with the sender's own VMSHELL (the gateway is read-only in
production — it never holds keys). `--writes` exists so `scripts/deploy.sh`,
the deploy endpoint, and the local demos can keep using the dev keys
(`scripts/.work/*.keys.json`); it must never be enabled on a public host.

With `--writes`, `/claim` and `/factory/<addr>/deploy` sign with
`scripts/.work/holder.keys.json` (the wallet deployed by
`scripts/deploy.sh`); the keys never leave the server. Without the multisig
ABI (auto-located in `contracts/0.79.3_compiled/...` or the acki-research
checkout) or without the holder keys, the claim form / deploy form explains
what is missing.

Then open `http://127.0.0.1:8000/`.

## How it works

- Getter reads are served from `scripts/mirror.py`: **one GraphQL call per
  company** fetches the persistent state (a BOC), which `MirrorState`
  decodes locally and turns into every getter result (`run_getter`).
  tvm-cli is only a fallback if the mirror fetch/decode fails (5-second
  cache per (address, method, params)). Verified 17/17 getters byte-identical
  to live tvm-cli on shellnet, including `getFingerprint`/`getCharterFingerprint`
  (cell-hash reimplementation) and `getClaimableOf`.
- Stored payloads are base64 data URIs (`data:<mime>;base64,...`); the
  gateway decodes and serves them with the correct `Content-Type`.
- If a company stored a `ui` bundle, `/company/<addr>/` returns it directly —
  the company's own on-chain app. Otherwise a readable showcase is generated
  from `getCompanyInfo`/`getCompanyImage`/`getSIIRImage`/`getCharter`.
- Companies are registered by `scripts/deploy.sh` (writes
  `scripts/.work/companies.json` at the end of a run); you can also hand-edit
  that file with any company address.
- **SHELL is never shown as a dividend (v2.5.0):** holder/claimable/
  treasury/statement views filter out currency id 2 (the contracts reject
  SHELL dividend tracks with `ERR_BAD_DIVIDEND_CURRENCY`); SHELL still
  shows on the marketplace as a trade currency.
- Analytics endpoints are pure mirror reads — valuation uses the live
  order-book mark only (no on-chain oracles, no extra writes). The
  company's decoded `_factory` is legacy `0:<hex>`; analytics normalizes
  it to the self-rooted `<hex>::<hex>` before factory getters.

## Notes / limits

- Read-only and localhost-bound by default; production would put a real
  mirror-node client or GraphQL behind it. The mirror client already does
  the GraphQL work in-process (see `docs/shellnet-decoding.md`).
- The gateway is a wallet **only for its own holder account** (`/claim`):
  every other operation stays read-only. Other holders still claim by signing
  their own wallet (see `usage.md`).
- `POST /claim` still requires tvm-cli (it signs and sends the external
  message); a pure-`/v2/messages` sender is a future step (see `docs/TODO.md`).
- Reading a whole register is cheap with the mirror client: the whole state
  is one GraphQL call, so register/holder scans are pure local decodes with
  no per-SIIR round trips; `truncated` only applies when the scan is huge
  (time budget ~25 s).