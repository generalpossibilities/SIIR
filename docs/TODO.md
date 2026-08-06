# TODO — production readiness

Backlog for the SIIR project. Everything completed so far is in `git log`
(and `docs/project.md`). Open items below are ordered by priority; P0 items
are correctness/security-critical, P1 are the remaining product surface,
P2 are independence proofs, P3 are mainnet/ops hardening.

Project-end goals (per the founder):
- **Independence**: the protocol must run without a paid server — reads from
  the public mirror node, content from the chain, no tvm-cli dependency.
- **UI deployability**: everything currently done from the CLI
  (`scripts/deploy.sh`) must be reachable from a browser.

Current live deployment (shellnet, v2.1.0 stack): factory
`82a2ff688d97c434697602f8dbe38c4d0e582a4f5e4f5d936b29589c422791e6` (self-rooted),
10B company `…::6890748c…`, rounds company `…::3d74a393…`, marketplace/escrow
`…::1c67df9c…` (see `docs/project.md` §8.4).

## P0 — Security, keys & correctness

1. **Gateway write-endpoint auth**: `POST /company/<addr>/claim` signs with
   `scripts/.work/holder.keys.json` and has NO authentication — anyone who can
   reach the gateway can spend the wallet's VMSHELL reserve. Decide the
   signing model (browser wallet vs. server key custody behind an auth token)
   and implement; keep local keys for dev only. Everything from the browser
   (`scripts/deploy.sh` equivalents) hangs off this decision.
2. **Grant/revoke founder rights** (`CompanySIIR` governance v2.1.0) is still
   a no-op placeholder — implement it and cover it with the governance parity
   suite.
3. **Commit the regression harness**: the parity suites referenced in the docs
   (JS/Python decoder parity 24/24, DOM smoke 33/33) are not in the repo —
   commit the tests, the fixtures, and a runner (`make test`-style).
4. **CI beyond Pages**: `.github/workflows/pages.yml` only deploys `static/**`
   to GitHub Pages; add a test job (parity suites + `scripts/deploy.sh` lint)
   on every push.
5. **Abuse controls**: rate-limit gateway write endpoints; document and
   enforce VMSHELL-reserve guardrails for the signing wallet (§8.5/§8.6).

## P1 — Marketplace, explorer & UI write flows

6. **Explorer redesign (done this round)**: marketplace is the landing page
   (`#/`), escrow address card with one-click "copy escrow address" and
   long-press full-address reveal, token filter chips, companies/SIIRs
   reachable only through search (no directory on the landing). Verify the
   same on the gateway's `/` landing and the GitHub Pages deployment.
7. **Multi-token trading**: NACKL/SHELL/eccUSDC must all be tradable on the
   marketplace — token pair view (prices per currency, pair switcher), and
   extend the marketplace contract with direct token-pair trades if needed
   (today listings price a SIIR deed in a single currency).
8. **Browser write flows** (replaces the CLI lifecycle): company creation,
   funding (giver faucet), issue, transfer, deposit dividends, claim (exists,
   P0.1), charter upload + ratification, marketplace list/bid/acceptBid.
9. **Live verification of every UI action**: after each browser write, the
   explorer must reflect it instantly via mirror read-back (extend the
   gateway parity scripts to cover the write paths).

## P2 — Independence (zero server, zero tvm-cli)

10. **Remove tvm-cli from gateway reads**: `run_getter` should be mirror-only
    (tvm-cli fallback kept for writes until P0.1). `getGovernance` must be
    decoded from the mirror like the other getters (tvm-cli 3.0.0 cannot
    decode it; `scripts/gov_state.py` is the mirror-based workaround).
11. **Clean-machine proof**: from a machine with only a browser — register,
    holders, plans, treasury, history, claims (amounts; signing is P0.1),
    deed, marketplace, search all work with no server process
    (verify on `file://` and the GitHub Pages deployment).
12. **On-chain UI bundle**: regenerate after every explorer change
    (`static/bundle.py`), confirm it still decodes via the content gateway
    (`/company/<addr>/` and `/app`).

## P3 — Mainnet readiness, docs & ops

13. **Mainnet config**: giver funding, fee/bounce parameters, network
    constants — remove shellnet specifics from `scripts/deploy.sh` and the
    explorer defaults; document the mainnet equivalents.
14. **Docs**: `docs/usage.md` governance + marketplace + explorer sections;
    README production checklist (keys, gateway auth, reserve funding);
    `docs/TODO.md` cleanup (this file stays current).
15. **Post-deploy verification script**: one command that replays the parity
    suites + the deploy.sh step 1–14 smoke against a fresh deployment.
16. **Explorer design polish** (ongoing, global-standard bar): responsive
    layout, dark mode, token icons, order-book view of the marketplace,
    i18n-ready strings.

## Closed this round

- Explorer redesign items 6 (static + gateway landings) — commit + Pages deploy.
- TODO rewritten to the P0–P3 production-readiness structure.
