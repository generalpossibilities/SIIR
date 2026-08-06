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

1. **Gas & signing model — DECIDED: user-paid gas (model A).** Every wallet
   self-funds a small VMSHELL balance; transfers, claims, lists, bids and
   deploys are signed by the user's own keys (browser wallet) and submitted
   directly to the chain. The gateway is **read-only by default** (done this
   round: `POST /claim` → 403, `--writes` opt-in for dev networks only,
   per-IP rate limit 10/min on write endpoints). Remaining: the browser
   wallet itself — sign external messages in-browser (ed25519 via WebCrypto)
   and relay them to the chain endpoint; the public shellnet mirror GraphQL
   accepts external messages (verified live: signed `callx` lands with a
   tx_hash through `https://shellnet.ackinacki.org/graphql`), the relay query
   is the ton-node's hidden operation, format to be pinned in P1.8.
2. **Grant/revoke founder rights** (`CompanySIIR` governance v2.1.0) is still
   a no-op placeholder — implement it and cover it with the governance parity
   suite.
3. **Commit the regression harness — DONE**: `tests/` now holds the parity
   harness — `gen_ground.py` (ground-truth generator against the live
   deployment), the committed fixture `fixtures/py_ground.json` (18 fields),
   `static/parity.js` (env-overridable addresses, BigInt/key-order-safe
   comparison, verified ALL MATCH 18/18), and `tests/run_parity.sh` +
   `tests/run_dom_smoke.sh` (6/6 headless-Chrome assertions) as the runners.
4. **CI beyond Pages — DONE**: `pages.yml` gained a `test` job (py_compile of
   all Python, JS/Python parity vs the committed fixture, bundle build) that
   triggers on `static/**`, `scripts/**`, `tests/**`, `contracts/**`.
5. **Abuse controls — partially done**: rate limit (10 req/min/IP) on write
   endpoints; still open: VMSHELL-reserve guardrails for the dev signing
   wallet (§8.5/§8.6).

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
8. **Browser write flows** (replaces the CLI lifecycle; gas is user-paid per
   P0.1): company creation, funding (self-funded wallets — the freemium
   shellnet giver is a dev-only faucet; on mainnet users fund their own
   wallets), issue, transfer, deposit dividends, claim, charter upload +
   ratification, marketplace list/bid/acceptBid. Signing: in-browser ed25519
   (WebCrypto) + external-message relay to the chain endpoint; first pin the
   relay request format (see P0.1).
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
