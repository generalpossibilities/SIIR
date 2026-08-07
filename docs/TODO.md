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

Current live deployment (shellnet, v2.4.0 stack): factory
`d0f0bb83c277e3de12da83c97a6cb1fb0b4bf2e616e788f13bf728dfd986a5ea` (self-rooted),
10B demo company `…::a334e243…`, rounds company `…::4967f8e1…`, marketplace
`…::3f1cc88a…` (see `docs/project.md` §8.8).

## P0 — Security, keys & correctness

1. **Gas & signing model — DECIDED: user-paid gas (model A).** Every wallet
   self-funds a small VMSHELL balance; transfers, claims, lists, bids and
   deploys are signed by the user's own keys (browser wallet) and submitted
   directly to the chain. The gateway is **read-only by default** (done this
   round: `POST /claim` → 403, `--writes` opt-in for dev networks only,
   per-IP rate limit 10/min on write endpoints). Company creation via the
   gateway is **DONE**: `POST /factory/<addr>/deploy` (with `--writes`)
   validates + sends `deployCompany` from the gateway wallet with the
   deploy SHELL fuel and returns the new company — verified live (§8.8,
   §8.9; the deploy form page and the explorer's factory-page card are the
   v2.5.0 UI for it).
   Remaining: the browser wallet itself — sign external messages in-browser
   (ed25519 via WebCrypto) and relay them to the chain endpoint; the public
   shellnet mirror GraphQL accepts external messages (verified live: signed
   `callx` lands with a tx_hash through
   `https://shellnet.ackinacki.org/graphql`), the relay query is the
   ton-node's hidden operation, format to be pinned in P1.8.
1b. **Legacy addressing (closed investigation, not a defect)** — suspected
   post-migration routing breakage (self-rooted senders → self-rooted
   targets) turned out to be transient network queueing: legacy `0:<hex>`
   resolves to `<hex>::<hex>` for every sender, root dapp included.
   Verified live by cross-checking factory `last_trans_lt` movement and a
   successful company deploy (`cc` SHELL attached; see §8.8).
2. **Grant/revoke founder rights — DONE (v2.2.0)**: `grantFounderRights`
   + `revokeFounderRights` (original founder only, single-admin),
   co-founders hold full founder powers, key-rotation-friendly,
   register-frozen guard, `getFounders`/`getFounderRights` readbacks,
   `_coFounders` appended to C4 (older companies decode unchanged).
   Governed by the 13c demo (grant → co-founder ratify → single-admin
   rejection → revoke → dead key) and the 21-field parity suite
   (non-empty decode proven live against the rounds company).
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
   relay request format (see P0.1). **Done (v2.5.0, gateway-signed subset):**
   company creation is live through the gateway's deploy form page
   (`GET /factory/<addr>/deploy` under `--writes`, §8.9) and the explorer's
   factory-page deploy card when served from the gateway; `POST /claim`
   covers dividend claiming. Remaining for the pure-browser path: funding,
   issue, transfer, deposit, charter, marketplace (P0.1 relay still open).
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

- Company creation through the gateway: `POST /factory/<addr>/deploy`
  (`--writes`, rate-limited), verified live against the current factory —
  new company Active with the 20e9 reserve (§8.8).
- The SIIR seal (v2.4.0): protocol-fixed SVG stamp, plan-image window,
  tiered fallback, byte-identical browser/gateway renders; live on the
  demo company's SIIR pages.
- Routing investigation closed: legacy `0:<hex>` → self-rooted for every
  sender (root dapp included); root-dapp redeploy was never needed.
- Explainer updates: `project.md` §8.8, `SIIR.md` (fuel + seal + deploy
  endpoint), `gateway.md` (deploy route), this file.
