# Using SIIR — the simple guide

No tooling jargon. Just: what you do, what you need to supply, and where
things live.

---

## 1. The one-minute picture

SIIR = **the Shareholder Register is on the chain.**

- Your company is one contract: **`CompanySIIR`**. It mints **SIIRs** — digital
  deeds that represent share items in your cap table.
- A **SIIR is a non-fungible deed**. It has a serial number, a voting weight, a
  creation fingerprint, and a full transfer history. It cannot be burned.
- **The wallet holding the SIIR is the owner.** Whoever the register says owns
  a SIIR at any moment is the legal-ish owner of that share item. When you
  trade the SIIR wallet-to-wallet, ownership moves instantly, and the deed's
  history grows with a stamp.
- **Dividends belong to the SIIR** (not to whoever held it "on a record
  date"). Unclaimed dividends sit in the register and are paid to whoever owns
  the SIIR at claim time. Buying a SIIR means buying its pending dividends too.

Three pieces exist on-chain:

| piece | what it is | who cares |
|---|---|---|
| `SIIRFactory` | one shared "issuing office" that creates companies | the deployer (once) |
| `CompanySIIR` | **your** company's register — where SIIRs live | everyone |
| wallets | ordinary Acki Nacki wallets that hold SIIRs as owners | everyone |

---

## 2. What you supply to start a company

Only the company creator interacts with the factory. One call
(`SIIRFactory.deployCompany`):

| supply | meaning | example |
|---|---|---|
| `name` | company display name | `"NJD Ventures"` |
| `description` | one-line description | `"early-stage VC holdings"` |
| `website` | link, may be `""` | `"https://njd.example"` |
| `metadataUri` | link to logo / docs, may be `""` | `"ipfs://…"` |
| `logoImage` | **company logo, stored on-chain** (base64 data URI) | `"data:image/svg+xml;base64,…"` |
| `siirImage` | **deed card image** used for every SIIR, on-chain | `"data:image/svg+xml;base64,…"` |
| `ui` | optional static app bundle (HTML/JS), on-chain | `"data:text/html;base64,…"` |
| `charter` | **your immutable commitments** — how SIIRs & the company will be run | see below |
| `founder` | the founder's **wallet address** (legacy `0:hex`) | `0:4de04d6a…` |
| `founderPubkey` | the founder's signing **public key** | `0x4f1d97fa…` |
| `issuanceModel` | `0` = full cap now, `1` = rounds | `0` |
| `plans` | your share classes — a list of `{count, weight, label, issued}` | see below |
| `initialValue` | VMSHELL gas to give the new company | `100000000` |

Images and the charter ride along at deployment and are **stored in the
company contract itself** — Acki Nacki storage is free. They are
immutable for life and never referenced from a URL.

A `plans` entry — a tier/plan mints `count` SIIRs, each with equal
`weight`:

```json
{"plans": [
  {"count": 100,  "weight": 1000, "label": "Founder", "issued": false},
  {"count": 20,   "weight":  500, "label": "Series A", "issued": false}
]}
```

The factory then creates your `CompanySIIR` at a **deterministic address** —
you can know its address before it exists. From that moment the company
contract is **immutable for life**: the founder can issue, but nobody can
change the rules, the share classes, the images, the charter, or the code
ever again.

---

## 3. How SIIRs get minted — `issue()`

The founder (only) calls `CompanySIIR.issue()`. It mints the **next declared
plan/round** in declared order into the founder's wallet, and marks that plan
`issued`.

- **Model A (full cap):** all plans are declared up front; `issue()` must be
  called once per plan until the cap is reached. After that the supply is
  frozen forever — you declared it all at creation.
- **Model B (rounds):** Genesis is declared at creation; later plans are added
  only as explicitly declared rounds, and only the founder can do it at the
  declared time. **Silent minting is impossible** — every SIIR ever can be
  traced to a declared plan.

Your total voting weight = Σ(weight × count of minted SIIRs). Every dividend
math uses these weights, never inflation of the register.

---

## 4. Where SIIRs are stored — the important part

**SIIRs do not sit in anyone's wallet balance-map like tokens.** They live
inside the **`CompanySIIR` register**, as rows keyed by serial number:

```
siir id 1  -> { weight: 1000,  owner: <address>,  checkpoint: …, history: [...] }
siir id 2  -> { weight: 1000,  owner: <address>,  checkpoint: …, history: [...] }
…
```

The `owner` field is an **address** — usually a wallet contract, but it can
even be a bare wrapped key. That's it. "A wallet owns a SIIR" means **the
register lists that wallet as the owner of that serial**.

So the company contract is the source of truth, and it is always readable
(no wallet needed to look up):

| tell me | call |
|---|---|
| who owns SIIR #5 | `getOwnerOf(5)` |
| all SIIRs a wallet owns | `getSIIRsOf(<wallet>)` |
| how many a wallet owns | `getBalanceOf(<wallet>)` |
| everything about deed #5 | `getSIIR(5)` |
| the deed's identity hash | `getFingerprint(5)` |
| full transfer history of #5 | `getHistory(5)` |
| the whole register, plans, info | `getSIIRsOf + getPlans + getCompanyInfo` |

> Owner addresses in getters use the legacy `0:hex` form (see `wallet.md` for
> CLI address forms).

---

## 5. Day-to-day actions

### 5.1 Transfer a SIIR (sell / gift)

Anyone can transfer **the SIIRs they own**, to any wallet address:

```
CompanySIIR.transfer(ids: [1, 3], newOwner: 0:e313c6…)
```

- Only the current `owner` can move a deed.
- The register updates the owner and appends a `HistoryEntry`
  `{from, to, timestamp}`.
- The SIIR keeps its serial, weight, and — critically — its **unclaimed
  dividends** go with it. Check `getClaimable(id)` *before* you sell.

### 5.2 Deposit dividends (anyone)

Any wallet from **any dapp** can drop SHELL dividends into the register:

```
depositDividends()   — attach SHELL as currency {2: <amount>} in the message
```

- The register raises the global **dividend index** by
  `amount ÷ totalWeight`. No fund-raising, no whitelist.
- Deposits are tracked: `DividendDeposited(depositor, amount, dividendIndex)`.

### 5.3 Claim dividends (holders)

The owner of a SIIR claims its pending payout:

```
claim(ids: [1, 3])
```

- Payout for each SIIR = `weight × (index − checkpoint) ÷ SCALE`; the
  checkpoint then moves up so you never double-claim.
- Payment is **SHELL** and arrives at the claiming wallet **immediately**.
- Anyone can see what a deed is owed at any moment: `getClaimable(id)`.

---

## 6. Reading it all back (verification checklist)

After any step you can verify on-chain with the getters — no trust needed:

```
✅ getCompanyInfo     -> name, model, issuedCount, totalWeight
✅ getPlans           -> which plans exist, which are issued
✅ getSIIRsOf(wallet) -> exactly the deeds that wallet owns
✅ getFingerprint(id) -> stable identity hash (weight, createdAt, round, label, uri)
✅ getHistory(id)     -> every transfer, oldest → newest
✅ getClaimable(id)   -> exact SHELL owed right now
✅ getCompanyImage()  -> on-chain company logo
✅ getSIIRImage()     -> on-chain deed card image
✅ getCharter()       -> the founder's immutable commitments + ratified flag
✅ getCharterFingerprint() -> stable hash to pin an off-chain copy against
```

---

## 7. The charter — the founder's word, frozen

When you start a company you also supply a **charter**: your written,
up-front statement of how the company and its SIIRs will be run (rules,
commitments, promises to investors).

- It is **frozen at deployment** inside the immutable company contract.
  Not even you can edit it afterwards.
- **You ratify it personally**: one call to `ratifyCharter()` marks it
  `ratified = true` and records a timestamped acknowledgment under your
  own key (`CharterRatified` event). This is your signature on the rules.
- **Investors can query it** at any time: the full text, the ratification
  flag, and a stable fingerprint.

> Why it matters: if you ever act differently than you promised in the
> charter, anyone can prove it. The immutable text, the on-chain register
> state (declared plan, dividend accounting), and your key-signed
> ratification form an evidentiary record usable against you. Make the
> charter honest.

A sensible charter covers: no silent minting; dividends belong to the
SIIR and are paid in SHELL; transfers are recorded forever; founder
obligations and deadlines; commitment not to alter dividend accounting.

---

## 8. What you *don't* need

- **No special "SIIR wallet" contract.** Ordinary Acki Nacki multisig or
  smart wallets already hold SIIRs — ownership is just the register's `owner`
  field.
- **No oracles, no record dates, no off-chain cap-table.** The register is the
  cap table.
- **No trust that a price was declared.** This design deliberately stores no
  market valuation — SIIRs are claim-weights, and value is agreed elsewhere
  at trade time.

Handy references: `wallet.md` (wallet creation + address forms),
`giver3.md` (funding), `project.md` (how it's built and how every piece
works).