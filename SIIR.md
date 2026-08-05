# SIIR Protocol Specification

## Core Principle

**SIIR is the internet-native ownership standard. Every SIIR is a
permanent, transferable digital deed that represents a verifiable
portion of a real or digital asset. The blockchain itself becomes the
shareholder register, and possession of a SIIR is possession of
ownership.**

A company is three things: an identity, ownership, and cash flow.
SIIR owns all three.

Want to know who owns the company? → Check who holds the SIIR.
Want to transfer ownership? → Transfer the SIIR.
Want to receive dividends? → Hold the SIIR.
Want to vote? → Hold the SIIR.

No cap table. No registrar. No transfer agent. No paperwork. Just the
SIIR.

SIIR (Share Immutable Investment Record) is an ownership protocol on
the Acki Nacki chain. It is not a share protocol and not an NFT
protocol — it is an ownership protocol.

## Objects

The protocol has exactly three objects. Nothing else.

    SIIR Protocol
        ↓
      Company
        ↓
       SIIR

### 1. Company

Immutable after creation.

Stores: - ID - Name - Description - Founder wallet - Website -
Treasury - Creation time - Maximum ownership (always 100%) - Minted
total - Founder allocation / investor allocation (tracked on
transfers)

A valuation is never stored. Valuation changes every day; immutable
data does not. The market decides value.

The Company contract is itself a non-fungible asset: the Company
Identity NFT. It holds all data an NFT can hold — incorporation
information, documents, IP references, auditors, issuer signature —
plus its own metadata URI and artwork. Identity and register are one
and the same object.

Companies never write smart contracts. The SIIR Factory deploys from
validated creation parameters.

Creation parameters: - Company metadata and metadata URI - Founder
wallet - Issuance model (full capitalization or rounds) - Class model
(uniform or tiered, with chosen tier names and weights) - Total SIIR
supply

### 2. SIIR

Ownership exists inside the SIIR — not in balances, not in wallets.
Every SIIR is unique.

Each SIIR is a non-fungible, transferable on-chain asset, an NFT in
its own right, with full NFT data capacity.

Stores: - SIIR ID (serialized) - Company ID - Weight - Current owner -
Creation block - Full ownership history - Pending reward checkpoint -
Metadata URI - Immutable rights

Every SIIR has a fingerprint: a hash of all immutable creation data.
Anyone, anywhere, in any wallet, can verify that "this SIIR has never
changed" — forever.

Classes are optional and company-chosen. At creation, each company
picks its own structure, locked forever:

- **Uniform**: every SIIR has the same weight. All equal, simple.
- **Tiered**: the company defines its own tiers and labels — e.g.
  Bronze, Silver, Gold, Platinum, or any names it wants — each tier
  mapped to a weight the company chooses.

The protocol math only ever uses weights; tier labels never affect
value. But tiers are real: they are stored in the company contract,
carry their own designs/metadata, and let companies drive competition
and easy handling (e.g. "Gold round" sales). A tier is a name plus a
weight, and the whole structure is immutable after creation.

Why non-fungible: ownership records are naturally unique. No two
people own the same share. Fungible units lose history — if you sell
3,251 of 12,500, nobody knows which ones. With SIIR, every ownership
certificate has a life, traceable from genesis to the current holder.

### 3. Treasury

The treasury knows only Deposit() → Update SIIR rewards. No
shareholder list. No investor emails. No bank accounts.

The company deposits value; the protocol computes a global dividend
index = (deposited value / total weight) added to the previous index.
Each SIIR's pending value is weight × (dividend index − its
last-claimed checkpoint).

## Immutable Rules

These rules are fixed at protocol level and can never be changed by
any company or by the factory:

1.  **SIIR cannot be burned.** Ever. An SIIR is an immutable ownership
    record; destroying it would permanently destroy part of the
    company's ownership. Even a lost wallet does not destroy the SIIR —
    it remains, inaccessible until the wallet is recovered (if ever).

2.  **Every company has exactly one immutable SIIR contract for life.**
    The shareholder register is a single on-chain object, never a
    collection of contracts. No second company contract is ever
    deployed.

3.  **The issuance model chosen at creation is immutable.** Each
    company picks one of two models when it deploys, and that choice
    can never change:
    - **Full capitalization**: the entire supply is minted once, at
      creation. Selling is always a transfer, never a mint. New SIIRs
      are never created after creation day.
    - **Issuance rounds**: the Genesis round is minted at creation;
      later rounds are minted under clearly defined rules chosen at
      creation (timing, quantity, price or weight, who may trigger).
      Rounds are explicit, announced, and recorded — never silent
      minting.

    In both models, supply can only ever grow in ways the founder
    declared on day one.

## Issuance

The company chooses its issuance model at creation:

**Model A — Full capitalization:** the founder mints the entire supply
of the company at creation. Sell 10%? Transfer 10,000 SIIR. Done.
Ownership changes through transfers — never by creating new units.
This is how startups think about equity: the full capitalization
exists from the beginning, and every sale is a movement of existing
ownership. Every transfer is permanently recorded in the history of
the SIIRs moved.

    Company SIIR
    └── Genesis (full capitalization)
        100,000 SIIR  →  minted to founder

**Model B — Issuance rounds:** the founder mints Genesis at creation
and keeps the right to issue defined later rounds inside the same
contract:

    Company SIIR
    ├── Genesis      →  minted at creation
    ├── Series A     →  defined round
    └── Series B     →  defined round

Each round is declared with its rules (quantity, weights, who may
trigger it) and locked when the round is created; every round is an
explicit, auditable event. The choice between Model A and Model B is
made at creation and can never be changed.

Existing companies can adopt SIIR without protocol changes: issue SIIR
matching today's cap table and deliver every shareholder their SIIRs.
Ownership simply becomes transferable on-chain.

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

## Treasury & Dividends

Protocol rule — pending dividends belong to the SIIR, not the holder:

- Whoever owns the SIIR at claim time receives the attached value.
- A buyer of a SIIR inherits pending dividends with it; pending value
  prices itself into the trade (cum-dividend).
- Claim is a single action from any wallet currently holding a SIIR; a
  claim button appears and highlights inside each wallet that holds a
  SIIR with unclaimed value. The owner can claim at any time.
- No record-date snapshot, no per-holder accounting, no settlement on
  transfer. Only the SIIR's checkpoint ever changes.
- Dividends are paid in SHELL (ecc currency id 2), which transfers
  across Dapp IDs — so contributors and holders are never bound by the
  app boundary VMSHELL imposes. Swap to a TIP-3 ecc token (e.g.
  eccUSDC) later is a payout-module change, not an accounting change.

## Transfer

Transfer changes only ownership.

    Owner(wallet A) -> Owner(wallet B)

All future rights belong to wallet B. Pending dividends remain
attached to the SIIR and become claimable by wallet B. The transfer is
appended to the SIIR's history; nothing is ever deleted.

## Governance

Optional. Voting power = SIIR weight. Founder controls governance
until enabled by the founder at creation.

## Dissolution

A defined lifecycle for ending a company:

- Company votes to dissolve (or founder if governance is disabled).
- Treasury is frozen.
- Final distribution is deposited.
- Holders claim their final value.
- After a long grace period (e.g., years), any unclaimed funds follow
  an immutable rule chosen at company creation: burn to treasury,
  charity, DAO, or other fixed destination.

The SIIR itself survives as a historical ownership record.

## Deployment Flow

1.  Deploy SIIR Factory.
2.  Founder calls CreateCompany() with metadata, issuance model, class
    model, and supply plan.
3.  Factory deploys the one Company SIIR contract (the Company
    Identity NFT).
4.  Mint the Genesis supply (full capitalization, or the Genesis round)
    to the founder.
5.  Sell by transfer — or by the founder's declared round rules.
6.  Company deposits dividends.
7.  Holders claim.
8.  Secondary trading requires no company interaction.

## Suggested Modules

-   Factory
-   CompanyRegistry
-   SIIRDeed (non-fungible, history-aware, fingerprint-verifiable)
-   Treasury
-   DividendEngine
-   Governance
-   Dissolution
-   Migration tooling (cap-table import for existing companies)
-   Marketplace hooks
-   Wallet SDK
-   Explorer API

## Security

-   Immutable implementations
-   Company contracts are never updated or upgraded
-   SIIR fingerprint hashes are verifiable forever
-   No valuation stored in immutable state
-   Reentrancy protection
-   Permission minimization
-   Auditable events
-   Transfer-safety checks (cannot burn, cannot lock forever)

## Developer Roadmap

Can be built all at once — the protocol is one coherent system, not a
sequence of dependencies. The build order below is only a delivery
preference for testability, not a protocol requirement:

Factory - Company creation - Issuance (both models) - Transfers -
Ownership history - Fingerprint - Treasury - Dividend claims - Wallet
integration (claim button, deed view) - Explorer - Governance -
Dissolution - Marketplace - SDK - Indexer - Migration tooling -
Documentation

## Live Implementation (Shellnet)

The core is built and running on Acki Nacki shellnet
(`shellnet.ackinacki.org`); `scripts/deploy.sh` runs the full lifecycle
end to end in one pass:

1. Deploy `SIIRFactory` (self-rooted dapp; stores the `CompanySIIR` code
   cell, generated via `tvm-cli decode stateinit`).
2. Deploy the founder wallet (precompiled multisig, self-rooted).
3. `deployCompany` → `CompanySIIR` in the factory's dapp.
4. `issue()` mints the declared plan (verified: 100 SIIRs, totalWeight
   100000).
5. `transfer(ids, newOwner)` moves ownership wallet-to-wallet and writes a
   `HistoryEntry`.
6. `depositDividends()` credits SHELL from any dapp; the dividend index
   rises by `amount * SCALE / totalWeight`.
7. `claim(ids)` pays the holder SHELL exactly `weight * index / SCALE`
   (verified: 0.1 SHELL per 1000-weight SIIR on a 10 SHELL deposit).

Verified on-chain mechanics learned while building:

- Externally-deployed (self-rooted) contracts live at `<own>::<own>`;
  children inherit the parent's dapp id (`<factory>::<company>`).
- `tvm-cli genaddr --setkey --save` bakes the pubkey into the tvc;
  deploy must pass `--dst-dapp-id <own>` and the key-baked tvc.
- ABI address params use legacy `0:hex`; CLI `--addr`/`account` use the
  extended `dapp::acct` form.
- External messages arrive with `msg.sender` = an `addr_extern`, so
  founder auth keys off `msg.pubkey()` (see `_isFounder`).
- SHELL (ecc) is message-attached: read via `msg.currencies[2]`, send via
  `dest.transfer({currencies: {2: x}})`; it crosses dapps, VMSHELL does not.
- Wallet contracts holding/trading SHELL need SHELL credited to their ecc
  balance (giver `sendCurrency`, no flag 16); VMSHELL gas is separate.

## Guiding Principle

"The SIIR is the shareholder register. The wallet holding the SIIR is
the owner."
