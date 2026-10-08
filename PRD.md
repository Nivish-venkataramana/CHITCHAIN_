# Product Requirements Document: ChitChain (working title)

| | |
|---|---|
| **Version** | 0.2 (draft, aligned to `TEAM_SPLIT_PDF_FLOW.md`) |
| **Status** | Prototype scope, ready for build |
| **Date** | 9 October 2026 |
| **Team** | Pruthvik, Ujwal, Nivish, Pranav |
| **Repo** | https://github.com/hackering-2-0/HR2-OI-97C052DD |
| **Companion doc** | `README.md` (team split, tasks per person, setup) |

**Source of truth for scope:** the hand-drawn flow (YO.pdf) and `TEAM_SPLIT_PDF_FLOW.md`. Anything not in those is out of scope for the prototype (section 17).

---

## 1. Summary

ChitChain is a decentralized chit fund. A volunteer creates a **circle** and invites friends by username. After the group reviews and agrees on the terms, every member grants **autopay permission**. Each month the money is **pooled** on the 1st, and members **bid in secret** (commit-reveal) for the pot. The lowest valid bid wins and is paid; the rest of the pot becomes a **dividend** that carries into the next month's pool. Smart contracts hold and enforce the money.

The deliverable is a **prototype on Base Sepolia** that demonstrates one full run: wallet, account, circle, issues, autopay, pool, bid, payout.

## 2. Problem

Traditional chit funds depend on an organizer who collects, holds and pays out the money, and whose auction process members must trust. ChitChain removes that trust requirement: money sits in a contract, contributions come from pre-approved autopay on the same day for everyone, and bids stay secret until reveal and are public afterwards.

## 3. Goals and non-goals

### Goals
- G1. A user can create a wallet, add test money, and create an account whose unique username contains their real name and is bound to the wallet address.
- G2. A volunteer can create a circle, invite members by username, and only invite people who hold at least 3 x the monthly amount.
- G3. Members can review the terms by raising issues with comments; the volunteer resolves them; everyone confirms "No issues".
- G4. Every member grants a tightly-scoped autopay permission; the circle starts when all have done so.
- G5. Contributions are collected into a per-circle vault on the 1st of each month.
- G6. Members bid in secret, the lowest valid bid wins, bids become public after reveal, and the winner is paid on-chain.
- G7. The demo can be run in a few minutes with a short-window mode and manual "Continue" holds, with no timeouts in front of judges.

### Non-goals (prototype)
Everything in section 17, notably: fiat on-ramps, DeFi yield, locked reserves, SMS/WhatsApp/push, indexers and external services, a separate backend service, mainnet, audit, KYC beyond the username rule, legal and tax review.

## 4. Users

| Persona | Description | Needs |
|---|---|---|
| **Volunteer** | Member of a friend group who sets the circle up | Easy setup, clear invite status, a way to resolve members' concerns |
| **Member** | Anyone invited | Know the terms before committing, safe autopay, a fair secret auction, visible results |
| **Admin (demo only)** | A team member driving the demo | Step-by-step control (HOLD / Continue) of the scheduler |

## 5. End-to-end flow

1. **Wallet and account** (Pruthvik): create a wallet, add money, create an account with a unique username containing the real name, bound to the wallet public key.
2. **Home** (Ujwal): choose **Create a circle** or **Are you existing in a circle**.
3. **Create circle** (Ujwal): volunteer sets name, number of people, amount per month, duration. Conditions apply (section 7.2).
4. **Invites** (Ujwal): volunteer adds people by username. Before a request is sent, the candidate's balance must be at least 3 x monthly amount. The invitee sees: "You were added to [CIRCLE NAME] by [VOLUNTEER]. Verify whether you want to join." The volunteer sees Pending / Accepted / Rejected.
5. **Issues** (Ujwal): once the specified number of people have joined, members raise issues on number of people, duration, amount, or the people joined, with comments. The volunteer resolves all of them; every member submits "No issues". The circle becomes `Finalized`.
6. **Autopay** (Pruthvik): every member gives autopay permission to that circle's vault. When all have, the vault's `start()` is called.
7. **Pooling** (Nivish): pool collected on the 1st of each month (Jan 1, Feb 1, ...).
8. **Bidding** (Pranav): secret bidding, with the first bid at the end of month 1 (Jan 31), then winner selection and payout.

## 6. Core concepts and rules

| Term | Definition |
|---|---|
| **Circle** | One chit fund group |
| **Volunteer** | The member who creates and sets up the circle |
| **N** | Number of people in the circle |
| **Monthly amount** | Fixed MockUSDC amount each member pays each month |
| **Duration** | Number of months; must be **N-1 or N-2** |
| **Pool** | Total collected in a month (monthly amount x members who paid), plus any dividend carried forward |
| **Cycle** | One month: `Collect` (the 1st) -> `Bidding` (up to month end) -> `Settle` -> next month's `Collect` |
| **Bid** | The payout amount a member would accept; lowest valid bid wins |
| **Dividend** | Pool minus winning bid; carried forward into the next month's pool |
| **Smart account address** | A member's on-chain identity, from Pruthvik's wallet |
| **Autopay mandate** | A scoped session permission: only `MockUSDC.transfer` to that circle's vault, at most the monthly amount, once per cycle, expiring at circle end |

Chain and token: **Base Sepolia (84532)** and `MockUSDC` (6 decimals), plus Anvil for local mocks.

## 7. Functional requirements

Priority: **P0** must ship; **P1** should ship. Each requirement has exactly one owner, matching the team split.

### 7.1 Pruthvik: wallet, account, autopay

| ID | Requirement | Pri |
|---|---|---|
| FR-P1 | Wallet creation with Privy embedded wallet (email/phone login, plus connect existing wallet) and a Biconomy smart account on Base Sepolia; the displayed public key is the smart account address | P0 |
| FR-P2 | Gasless transactions via paymaster (Biconomy or Pimlico), so test wallets never need testnet ETH | P0 |
| FR-P3 | "Add money" screen: faucet button mints `MockUSDC` to the user's wallet and shows the balance | P0 |
| FR-P4 | Account creation form with real name and username; `username = name + something`; check normalizes case and spaces and requires the name to appear in the username | P0 |
| FR-P5 | Username uniqueness enforced on the server; account bound to the wallet address | P0 |
| FR-P6 | User API (`UserProfile`): search by username, get by username, get by wallet, login session; plus fixtures and a dev login (`x-dev-user`) for Ujwal | P0 |
| FR-P7 | Autopay step: each member signs one EIP-712 message installing a Rhinestone SmartSession mandate (scope in section 6) | P0 |
| FR-P8 | Per-member autopay status (Not given / Given) and a revoke button | P0 |
| FR-P9 | When all members have given permission, call the vault's `start()` | P0 |
| FR-P10 | Record a short demo video: wallet creation, account creation, adding money | P1 |

### 7.2 Ujwal: circles, invites, issues

| ID | Requirement | Pri |
|---|---|---|
| FR-U1 | Home screen with **Create a circle** and **Are you existing in a circle** (list of the user's circles with status) | P0 |
| FR-U2 | Create circle form: name, number of people, amount per month, duration | P0 |
| FR-U3 | Validation: amount positive, number of people at least 2, duration is N-1 or N-2 months | P0 |
| FR-U4 | Add people by username via Pruthvik's lookup API | P0 |
| FR-U5 | 3-month balance check: read candidate's stablecoin balance on-chain (read-only); require `balance >= 3 x monthlyAmount`; on failure show a clear reason and send nothing | P0 |
| FR-U6 | In-app join request: "You were added to [CIRCLE NAME] by [VOLUNTEER]. Verify whether you want to join." with Accept and Reject; Accept joins the circle | P0 |
| FR-U7 | Volunteer's request status board: Pending / Accepted / Rejected | P0 |
| FR-U8 | Issue stage starts once the specified number of people have joined; issue categories: number of people, duration, amount, the people joined (pick a member + comment) | P0 |
| FR-U9 | Every issue requires a comment; a member can submit multiple issues | P0 |
| FR-U10 | Volunteer resolves each issue with a response | P0 |
| FR-U11 | After all issues are resolved, each member presses **No issues** | P0 |
| FR-U12 | When all members have submitted No issues, status becomes `Finalized` and `FinalizedCircle` is published | P0 |
| FR-U13 | Circle data (circles, invites, issues, statuses) in Ujwal's own tables; no smart contract in this slice | P0 |
| FR-U14 | App shell and routing created in the first 15 minutes of Phase 0; sample `FinalizedCircle` JSON files | P0 |

### 7.3 Nivish: pooling money

| ID | Requirement | Pri |
|---|---|---|
| FR-N1 | `CircleFactory.createCircle(members[], monthlyAmount, durationMonths, token)` deploys one minimal-proxy clone of `PoolVault` per circle and emits `CircleCreated` | P0 |
| FR-N2 | `PoolVault` holds pooled tokens and runs the cycle clock: `Collect` -> `Bidding` -> `Settle` -> next `Collect` | P0 |
| FR-N3 | `recordContribution()` called by a member's smart account in the same batch as its token transfer; checks the vault balance grew by the monthly amount | P0 |
| FR-N4 | `collect()` after the collection window marks members who did not pay | P0 |
| FR-N5 | `start()` begins the first cycle (called by Pruthvik once all mandates exist) | P0 |
| FR-N6 | `IPool` exposes `currentCycle()`, `phase()`, `poolAmount()`, `members()`, `hasWon(addr)`, and bidding-contract-only `payout(winner, amount)` and `creditDividend(totalDividend)` | P0 |
| FR-N7 | Dividend carried forward into the next month's pool | P0 |
| FR-N8 | Month 1: pool collected on the 1st; first bidding at the end of that month | P0 |
| FR-N9 | No `transferFrom` pulling; publish `autopay-policy.json` describing the exact permission | P0 |
| FR-N10 | Mock session-trigger script on Anvil: impersonates members, runs `transfer` + `recordContribution`, option to skip a member | P0 |
| FR-N11 | Scheduler (Node script): triggers `collect()`, phase changes and `settle()`; demo mode uses short windows and HOLDs between bidding, reveal and settle until the admin clicks Continue | P0 |
| FR-N12 | `MockUSDC` (6 decimals, public `mint`) on Base Sepolia and Anvil, plus a script funding the demo accounts | P0 |
| FR-N13 | Pool screen: pool amount, month calendar (pool date, bid date), who has paid this month | P0 |
| FR-N14 | Deploy to Base Sepolia and verify on Basescan | P1 |
| FR-N15 | With Pranav: agree and freeze one payout rule (A or B, section 14) in `IPool.sol` comments, with matching `payout_vectors.json` | P0 |

### 7.4 Pranav: bidding

| ID | Requirement | Pri |
|---|---|---|
| FR-B1 | `BiddingModule` reads cycle and phase from `IPool` | P0 |
| FR-B2 | Commit: hidden bid `keccak256(abi.encodePacked(bidAmount, salt, msg.sender))`; nobody can see anyone's bid | P0 |
| FR-B3 | Reveal: amount and salt; invalid reveals rejected; unrevealed commits discarded | P0 |
| FR-B4 | Bid limit: not below the floor, not above the pool | P0 |
| FR-B5 | Winner: lowest valid bid; ties go to the earliest commit; a member who already won cannot win again | P0 |
| FR-B6 | No-bids fallback, agreed in Phase 0 (rollover or deterministic draw) | P0 |
| FR-B7 | Settle: call `IPool.payout(winner, bid)` and `IPool.creditDividend(pool - bid)` | P0 |
| FR-B8 | Public list: after reveal all bids readable via `bidList(cycle)` and emitted as events | P0 |
| FR-B9 | Bidding screens: commit, "waiting for reveal", reveal (with a clear warning that unrevealed bids are discarded), results with the full bid list and winner | P0 |
| FR-B10 | Demo-mode 1-Click Reveal: salt derived from a fixed signed message (circle, cycle, member); bid saved locally; one click re-derives the salt and reveals | P0 |
| FR-B11 | Unit and fuzz tests: hidden bids stay hidden, wrong salt fails, no double win, payout never exceeds the pool | P0 |
| FR-B12 | `IBidding` ABI stub within 2 hours; commit-reveal tested against Pranav's own `MockPool`; deploy to Base Sepolia and verify on Basescan | P0 |

## 8. Cycle timeline and economics

### 8.1 Timeline

```
Jan 1    Collect: autopay moves each member's monthly amount into the vault; pool recorded
         Bidding opens: members commit secret bids
Jan 31   Bid date (end of month 1): reveal, pick lowest valid bid, payout, dividend credited
Feb 1    Collect again; the dividend from January is already part of the pool
Feb 28   Bid date ...
...
```

The bid date is the **last day of the month**, as in the PDF (open question OQ-4 in section 14).

### 8.2 Settlement of one month (illustrative only)

Say 5 members, monthly amount 1,000, so the pool is 5,000. The lowest valid bid is 3,800.
- `payout(winner, 3,800)` sends 3,800 to the winner.
- `creditDividend(5,000 - 3,800 = 1,200)` carries 1,200 into the next month's pool.
- That winner cannot win again.

What happens at the end of the tenure, and how the first round is treated (Option A or B), depends on the payout rule agreed in Phase 0, so this document does not give an end-to-end example yet. Once `payout_vectors.json` is frozen, copy its examples into section 8.3 and use them as acceptance tests.

### 8.3 Frozen payout vectors
To be filled in from `payout_vectors.json` after the Phase 0 decision.

## 9. Circle states

Off-chain (Ujwal's tables):
```
Inviting -> IssueStage (required number joined) -> Finalized (all members submitted "No issues")
```
Then on-chain, per circle:
```
Vault deployed by factory -> Autopay mandates collected (Pruthvik) -> start() -> Running (cycles) -> Completed
```
Per cycle: `Collect -> Bidding (commit -> reveal) -> Settle`.

## 10. System architecture

```
One Next.js app (shell by Ujwal)
 ├─ features/account       Pruthvik: Privy + Biconomy wallet, username, user API, autopay permissions
 ├─ features/circle-setup  Ujwal: circles, invites, issues (Next.js API routes + Prisma/Postgres)
 ├─ features/pool          Nivish: pool screen, scheduler UI hooks
 └─ features/bidding       Pranav: commit / reveal / results screens

Base Sepolia (and Anvil for local)
 ├─ MockUSDC               Nivish
 ├─ CircleFactory          Nivish  -> clones PoolVault per circle
 ├─ PoolVault (IPool)      Nivish
 └─ BiddingModule (IBidding)  Pranav

Node scheduler (Nivish) triggers collect(), phase changes and settle()
```

Principles:
- Each person owns one vertical slice and one folder; slices connect only through the hand-off objects.
- No separate backend service, indexer, or per-service REST/OpenAPI files. Ujwal's and Pruthvik's server logic is Next.js API routes with Prisma.
- Chain is the source of truth for money, pool state and bids; Postgres holds users and circle-setup data only.

## 11. Hand-off objects

| Object | Owner -> consumers | Fields / contents |
|---|---|---|
| `UserProfile` + lookup API | Pruthvik -> Ujwal | `username`, `walletAddress`, `displayName`; search by username, get by username, get by wallet, login session |
| `FinalizedCircle` | Ujwal -> Pruthvik, Nivish | `circleId`, `name`, `members[]` (wallet addresses), `monthlyAmount`, `durationMonths`, `volunteer` |
| `IPool`, `pool.abi.json`, `autopay-policy.json` | Nivish -> Pruthvik, Pranav | Pool functions and events; exact autopay permission (destination, amount cap, once per cycle) |
| `IBidding` + ABI | Pranav -> Nivish | For the scheduler |
| `payout_vectors.json` | Nivish and Pranav jointly | Shared test examples for the payout rule |

All frozen in Phase 0. Changing one requires telling the team and updating the frozen file in the same PR.

## 12. Data

### Off-chain
- **Pruthvik:** `users` (username unique, wallet/smart account address, display name).
- **Ujwal:** circles, invites (Pending / Accepted / Rejected), issues (category, optional target member, comment, resolution response, status), member "No issues" flags, circle status.
- Both use PostgreSQL + Prisma (see OQ-10).

### On-chain
- `CircleFactory`: circle registry, `CircleCreated` events.
- `PoolVault`: members, monthly amount, duration, cycle number and phase, per-member payment status, pool amount, dividend carried forward, who has won.
- `BiddingModule`: per cycle commits, reveals, winner, bid list (`bidList(cycle)`), events.

## 13. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy of bids** | No bid is readable by anyone before reveal (contract state, events, UI, logs) |
| **Money safety** | Only the bidding contract can call `payout` and `creditDividend`; payout never exceeds the pool; reentrancy guards; SafeERC20 |
| **Autopay safety** | Mandate scoped to `MockUSDC.transfer` to that circle's vault, capped at the monthly amount, once per cycle, expiring at circle end; revocable |
| **Gasless UX** | Members never need testnet ETH |
| **Demo reliability** | Short-window demo mode; scheduler HOLDs until admin clicks Continue; 1-Click Reveal so a lost salt cannot stall an auction |
| **Secrets** | RPC and keys only in `.env`; never committed |
| **Testing** | Each owner tests their own slice (no separate QA owner); Foundry unit and fuzz tests for contracts |
| **Portability** | Same code runs on Anvil and Base Sepolia by changing env; addresses in `deployments/base-sepolia.json` |

## 14. Open questions and assumptions

Decide in Phase 0.

| ID | Question | Notes |
|---|---|---|
| OQ-1 | **Payout rule A or B** (Pranav and Nivish) | A: volunteer receives the Round 1 pot with no discount (commission-free), bidding starts in Round 2. B: circle dissolves early after N-1 / N-2 rounds and the remaining balance is split among members |
| OQ-2 | **Missed payment** | Simplest rule: member flagged, that month's pot reduced by their share, cannot bid any more |
| OQ-3 | **Rejected invite** | Can the volunteer invite someone else in the same slot? Suggested: yes |
| OQ-4 | **Bid date** | PDF shows Jan 31; earlier notes said the 2nd. Using last day of month |
| OQ-5 | **Pooling vs bidding ownership** | Assumed Nivish and Pranav; swap if preferred |
| OQ-6 | **Autopay stack** | Rhinestone SmartSession and Biconomy on Base Sepolia unverified; Phase 0 spike (2 hours) confirms; fallback is a pre-funded smart account sending the monthly transfer |
| OQ-7 | **Bid floor** | "Not below the floor" has no value yet |
| OQ-8 | **Who triggers `createCircle`** after `Finalized`, and when | The vault must exist before the autopay step |
| OQ-9 | **First-visit demo video pop-up** | Video is recorded by Pruthvik; showing it on the site is not assigned |
| OQ-10 | **Shared Prisma schema** | Suggestion: one schema file, each person adds only their own models in separate PRs |
| OQ-11 | **No-bids fallback** | Rollover or deterministic draw |

A concern to discuss, not a change to the split: the previous plan capped bids so that members who never win could always be made whole. The current scope only caps bids at the pool. Whether non-winners end up with a fair outcome therefore depends on the payout rule (OQ-1) and the floor (OQ-7), so test examples for this should be in `payout_vectors.json`.

## 15. Milestones and acceptance

Phases follow the split file; there are no calendar dates because the deadline is not fixed.

| Phase | Gate |
|---|---|
| **Phase 0** (about 45 min) | `UserProfile`, `FinalizedCircle`, `IPool`, `IBidding`, `autopay-policy.json` frozen; payout rule agreed; app shell exists; autopay spike started |
| **Phase 1** | Each slice works against mocks; stub contracts on Anvil within 2 hours |
| **Sync 1** (30 min) | Merged into `dev`; field names and event args aligned |
| **Phase 2** | Mocks replaced in this order: user API -> finalized circle -> autopay mandate -> pool -> bidding |
| **Sync 2** | One full run on Base Sepolia: wallet, account, circle, issues, autopay, pool, bid, payout |
| **Phase 3** | Fixes, demo script, wallet demo video |

**Prototype acceptance:** the Sync 2 run completes with no manual database or chain edits, bids are unreadable before reveal, the winner is paid the winning bid, and the dividend appears in the next month's pool.

## 16. Risks

| Risk | Mitigation |
|---|---|
| Autopay stack (Privy, Biconomy, Rhinestone) unverified on Base Sepolia | 2-hour Phase 0 spike; fallback pre-funded smart account |
| Pool and bidding contracts disagree on payout | One frozen rule in `IPool.sol` plus shared `payout_vectors.json`; both test suites pass the same examples |
| Time-based flow is hard to demo | Short windows in demo mode; scheduler HOLD / Continue |
| Lost salt stalls an auction | Demo-mode 1-Click Reveal with derived salt |
| Merge conflicts | One folder per person; merge to `dev` at syncs |
| Dependencies between slices | Frozen hand-off files and mocks (section 11 and README section 3) |
| Fairness for members who never win | Open concern (section 14) |
| Legal | Testnet only; chit funds are regulated in India (Chit Funds Act) and crypto assets carry VDA tax rules, so get advice before any real money |

## 17. Out of scope

Risk simulator and Markov chain, economics endpoints, risk panel; live fiat on-ramps (Onmeta, Mudrex) and mock payments service; DeFi yield (Aave) and yield adapter (may return later as an optional module behind `IPool`); locked 3-month reserve and voucher staking (only the balance check at invite time remains); SMS, WhatsApp and push notifications (in-app only); The Graph indexer, IPFS, Chainlink Automation, Sentry, Tenderly, i18n, PWA; a separate backend service and REST/OpenAPI files per service; a CI/QA owner role; KYC; mainnet; audit.
