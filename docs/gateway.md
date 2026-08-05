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

## Run

```bash
python3 scripts/gateway.py --port 8000            # shellnet by default
python3 scripts/gateway.py --port 8000 --net <other-net> --debug
```

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
- The gateway is not a wallet: transfers, deposits and claims are still
  signed transactions (see `usage.md`).
- Any tvm-cli networking quirk (e.g. message-delivery races) is invisible
  here — getters are local emulation against the mirror node.