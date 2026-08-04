# SIIR — Share Immutable Investment Record

**The internet-native ownership standard.**

Every SIIR is a permanent, transferable digital deed that represents a
verifiable portion of a real or digital asset. The blockchain itself
becomes the shareholder register, and possession of a SIIR is
possession of ownership.

A company is three things: an identity, ownership, and cash flow.
SIIR owns all three.

> **The SIIR is the shareholder register. The wallet holding the SIIR
> is the owner.**

---

## Why SIIR

Today, company ownership lives in spreadsheets, lawyers' offices, and
bank accounts. Investors hold paper that says someone else keeps the
records. Founders spend years doing shareholder admin by hand.

SIIR replaces the entire machinery:

| Problem | SIIR answer |
|---|---|
| Who owns the company? | Check who holds the SIIR |
| Transfer ownership | Transfer the SIIR |
| Pay and receive dividends | Hold the SIIR, press claim |
| Vote on decisions | Hold the SIIR |
| Verify a share is genuine | Check the SIIR fingerprint |

No cap table. No registrar. No transfer agent. No paperwork. Just the
SIIR.

---

## The Three Objects

The protocol has exactly three objects — nothing else.

```
SIIR Protocol
    ↓
  Company
    ↓
   SIIR
```

### 1. Company

Immutable after creation. One contract per company, for life.

- Holds identity: name, description, founder, website, treasury,
  creation time, issuer signature — the **Company Identity NFT**
- Tracks ownership state: maximum ownership (100%), minted total,
  founder/investor allocation
- Stores the company's immutable choices: issuance model, class
  model, governance settings, dissolution rule
- **Never stores a valuation** — the market decides value

### 2. SIIR

Ownership exists *inside* the SIIR — not in balances, not in wallets.
Every SIIR is unique, like a deed to a house.

- Serialized ID, company ID, weight, current owner
- Full ownership history, from genesis to today
- Pending dividend checkpoint
- Metadata URI and artwork
- **Fingerprint**: a hash of all immutable creation data — anyone can
  verify, forever, that this SIIR has never changed

### 3. Treasury

Knows only `Deposit()` → update SIIR rewards. No shareholder list. No
investor emails. No bank accounts.

---

## Design Pillars (Immutable Rules)

These rules are fixed at protocol level and can never be changed by
any company or by the factory:

1. **SIIR cannot be burned.** Ever. An immutable ownership record is
   never destroyed — even a lost wallet leaves the SIIR existing,
   recoverable when the wallet is.
2. **Every company has exactly one immutable SIIR contract for life.**
   The shareholder register is a single on-chain object, never a
   collection of contracts.
3. **The issuance model chosen at creation is immutable.** A company
   picks full capitalization or issuance rounds on day one, and the
   choice can never change. Supply never grows silently.

---

## Key Decisions

### Non-fungible, not fungible

Ownership records are naturally unique — no two people own the same
share. Fungible units lose history: if you sell 3,251 of 12,500,
nobody knows which ones. Every SIIR is a certificate with a life,
traceable from genesis to the current holder.

### Dividends belong to the SIIR

Unclaimed dividends are an attribute of the SIIR, not the holder:

- Whoever owns the SIIR at claim time receives the attached value
- A buyer inherits pending dividends (cum-dividend trading); the
  pending value prices itself into the trade
- Claim is one tap, from any wallet holding a SIIR with unclaimed
  value — a claim button appears right inside the wallet
- No snapshots, no per-holder accounting, no settlement at transfer

### Weights, not classes — unless the company wants classes

Protocol math only ever uses each SIIR's weight. Classes are optional
and company-chosen at creation:

- **Uniform**: every SIIR equal
- **Tiered**: Bronze / Silver / Gold / Platinum — or any names the
  company picks — each mapped to a weight, driving competition and
  design

### Issuance, company-chosen at creation

- **Model A — Full capitalization**: the entire supply is minted once.
  Selling 10% of a 100,000-SIIR company is transferring 10,000 SIIR.
  Never mint again. Ever.
- **Model B — Issuance rounds**: Genesis at creation, then defined
  Series A / B / C rounds inside the same contract, each round
  declared with rules and recorded as an auditable event.

### No valuation stored

Valuations change daily; immutable data does not. SIIR stores
ownership structure, never price. The market decides value.

---

## The Digital Deed

Clicking any SIIR shows everything verifiable about it:

- Company
- Owner
- Weight and percentage
- Rights and voting power
- Pending dividends
- Transfer history
- Issue date
- Founder signature
- Company signature
- Treasury status
- Fingerprint (immutability proof)

That is what an investor actually holds — not a picture, not a token.
A digital ownership deed.

---

## For Founders: Raise Capital

1. Create your company: metadata + issuance model + supply plan.
2. The factory deploys your one Company SIIR contract.
3. Genesis SIIRs are minted to you.
4. Sell by transfer — send SIIRs, money settles however you agree.
5. Deposit dividends; holders claim with one tap.
6. Secondary trading needs nothing from you — the SIIR is the contact.

Investor relations *is* the SIIR: holders can query the company
identity, treasury status, and their deed at any time, forever.

## For Existing Companies: Migrate

No protocol change needed. Issue SIIR matching today's cap table and
deliver every shareholder their SIIRs. Ownership simply becomes
transferable on-chain.

---

## Deployment Flow

1. Deploy SIIR Factory.
2. Founder calls `CreateCompany()` with metadata, issuance model,
   class model, and supply plan.
3. Factory deploys the one Company SIIR contract (Company Identity
   NFT).
4. Mint the Genesis supply to the founder.
5. Sell by transfer — or by declared round rules.
6. Company deposits dividends.
7. Holders claim.
8. Secondary trading requires no company interaction.

---

## Protocol Scope

- Factory (deploys companies; never modifies them)
- CompanyRegistry
- SIIRDeed — non-fungible, history-aware, fingerprint-verifiable
- Treasury & DividendEngine
- Governance (optional; voting power = SIIR weight)
- Dissolution lifecycle (frozen treasury, final distribution,
  immutable unclaimed-funds rule)
- Migration tooling (cap-table import)
- Marketplace hooks
- Wallet SDK (claim button, deed view)
- Explorer API

The build order is a delivery preference for testability — the
protocol is one coherent system and can be built all at once.

---

## Security

- Immutable implementations; company contracts never updated or
  upgraded
- SIIR fingerprint hashes verifiable forever
- No valuation stored in immutable state
- Reentrancy protection
- Permission minimization
- Auditable events
- Transfer-safety checks (cannot burn, cannot lock forever)

---

## Repository

| File | Purpose |
|---|---|
| `README.md` | This overview |
| `SIIR.md` | The protocol specification — build from this |

## License

MIT — see [LICENSE](LICENSE).
