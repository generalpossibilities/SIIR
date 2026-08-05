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
| `GET /` | index of companies (from `scripts/.work/companies.json`) |
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
| `GET /company/<addr>/siir/<id>` | SIIR page (weight, owner, round, label, metadata, fingerprint, claimable, transfer history); same data on `.../siir.json/<id>` |
| `GET /company/<addr>/siir/<id>/deed` | printable deed card: company + logo, holder, weight, claimable, fingerprint, provenance |
| `GET /company/<addr>/claim` | claim form for the gateway's wallet (the SIIRs it owns, with pending amounts) |
| `POST /company/<addr>/claim` | sends `claim(ids)` signed by the gateway wallet (JSON body `{"ids":["1"]}` or a form `ids=1&ids=2`; JSON reply when `Accept: application/json`) |
| `GET /company/<addr>/plans` | `getPlans` as JSON |
| `GET /company/<addr>/treasury` | `getDividendCurrencies` as JSON |
| `GET /company/<addr>/history/<id>` | `getHistory` entries as JSON |
| `GET /company/<addr>/search?q=...` | if `q` is an owner address -> holder page; otherwise substring scan of labels, metadata URIs and owner addresses. The same data is on `.../search.json?q=` |

## Run

```bash
python3 scripts/gateway.py --port 8000            # shellnet by default
python3 scripts/gateway.py --port 8000 --net <other-net> --debug
python3 scripts/gateway.py --port 8000 --multisig-abi <path-to-UpdateCustodianMultisigWallet.abi.json>
```

`/claim` signs with `scripts/.work/holder.keys.json` (the wallet deployed by
`scripts/deploy.sh`); the keys never leave the server. Without the multisig
ABI (auto-located in `contracts/0.79.3_compiled/...` or the acki-research
checkout) or without the holder keys, the claim form explains what is missing.

Then open `http://127.0.0.1:8000/`.

## How it works

- Content is read on-demand with `tvm-cli run ... --abi CompanySIIR.abi.json`
  (5-second cache per getter — the on-chain state is the source of truth).
- Stored payloads are base64 data URIs (`data:<mime>;base64,...`); the
  gateway decodes and serves them with the correct `Content-Type`.
- If a company stored a `ui` bundle, `/company/<addr>/` returns it directly —
  the company's own on-chain app. Otherwise a readable showcase is generated
  from `getCompanyInfo`/`getCompanyImage`/`getSIIRImage`/`getCharter`.
- Companies are registered by `scripts/deploy.sh` (writes
  `scripts/.work/companies.json` at the end of a run); you can also hand-edit
  that file with any company address.

## Notes / limits

- Read-only and localhost-bound by default; production would put a real
  mirror-node client or GraphQL behind it.
- The gateway is a wallet **only for its own holder account** (`/claim`):
  every other operation stays read-only. Other holders still claim by signing
  their own wallet (see `usage.md`).
- Any tvm-cli networking quirk (e.g. message-delivery races) is invisible
  here — getters are local emulation against the mirror node.
- Reading a whole register is expensive: each SIIR needs its own getter, so
  register/holder scans run through a small thread pool (8 workers) with a
  time budget (~25 s) and pagination; `truncated: true` means the budget was
  hit before the scan finished.