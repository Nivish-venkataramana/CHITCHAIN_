# ChitChain (working title): Team Build README

A decentralized chit fund prototype on **Base Sepolia**. Friends form a circle, pay monthly through **autopay**, and bid in **secret (commit-reveal) auctions**. Contracts hold and enforce the money.

**This README is the single source of truth for what each person builds.** It is written so you can drive **Antigravity** from it: each person has staged, paste-ready prompts (sections 7 to 10), and every prompt points back to the specs in this file. The split is the one in `TEAM_SPLIT_PDF_FLOW.md` (the hand-drawn flow, YO.pdf). Nobody moves work between slices without updating that file and this README together.

Companion: `PRD.md` (product requirements and acceptance).

---

## 0. How to use this with Antigravity

1. Each person opens the repo in Antigravity on **their own branch** (`pruthvik`, `ujwal`, `nivish`, `pranav`), branched from `dev`.
2. Start every agent session by pasting the **Global Context Block** (section 6). If your Antigravity version supports workspace rules, save that block as a rule file in the repo so every agent loads it automatically; if not, paste it by hand.
3. Then paste your staged prompts **one at a time, in order** (P1, P2, ...). Do not paste the next one until the current one's "Done when" checks pass.
4. Ask the agent to **write a short plan first** and wait for your OK before it edits files. It is far cheaper to fix a plan than a 40-file diff.
5. Agents may only edit **your folders** (section 3). If an agent wants to change a hand-off object (section 4), stop and tell the team.
6. Commit small and often on your branch. Merge into `dev` only at Sync 1 and Sync 2.
7. Anything marked **DEFAULT** (section 5) is a placeholder decision so agents don't stall. The team can change it in Phase 0; update this file when you do.

---

## 1. What we're building

### 1.1 The flow (from the PDF)

```
[Wallet creation + adding money]                              PRUTHVIK
[Create account: unique username containing real name,
 bound to wallet public key]                                  PRUTHVIK
        |
[Home: Create a circle  |  Are you existing in a circle]      UJWAL
  Volunteer sets: name, number of people, amount/month, duration (conditions apply)
  Volunteer adds people by username
  3-month balance check -> invite: "You were added to [CIRCLE NAME] by [VOLUNTEER].
                                    Verify whether you want to join."
  Volunteer sees Pending / Accepted / Rejected
  When everyone has joined -> members raise issues
     (number of people / duration / amount / the people joined) with comments
  Volunteer resolves all; every member presses "No issues"    -> Finalized
        |
[Everyone gives autopay permission]                           PRUTHVIK
        |
[Pooling money: Jan 1 pool, Feb 1 pool ...]                   NIVISH
[Bidding (smart contracts): Jan 31 bid ...]                   PRANAV
```

### 1.2 Rules in one place

| Rule | Detail |
|---|---|
| Username | Must contain the user's real name (`username = name + something`), unique, bound to the wallet public key |
| Circle size and duration | Number of people N is at least 2. **Duration must be N-1 or N-2 months** (and at least 1) |
| Invite gate | Candidate's stablecoin balance must be at least **3 x monthly amount** at the time the invite is sent. This is only a balance check, **no locked reserve** |
| Membership | The volunteer counts as one of the N people (DEFAULT, section 5). A circle starts its issue stage when all N are in |
| Issues | Categories: number of people, duration, amount, the people joined (pick whom + comment). Every issue needs a comment. A member can submit many |
| Finalize | Volunteer resolves every issue, every member presses **No issues**, circle becomes `Finalized` |
| Autopay | Each member signs one permission: only the monthly transfer to **that circle's vault**, capped at the monthly amount, once per cycle, expiring at circle end |
| Pooling | Collected on the **1st** of each month. The dividend from the previous month is carried into the pool |
| Bidding | Secret commit-reveal. Bid date is the **last day of the month** (Jan 31). Lowest valid bid wins; ties go to earliest commit; a member who has won cannot win again |
| Settlement | `payout(winner, bid)` to the winner, `creditDividend(pool - bid)` carried forward |

### 1.3 Network and token

- **Base Sepolia, chain ID 84532** for development, tests and the demo. Anvil for local mocks.
- `MockUSDC`: 6 decimals, public `mint`. **Amounts are always integers in base units (bigint or string). Never floats.** Example: 1,000 USDC = `1000000000`.

---

## 2. The split at a glance

| Person | Slice | Contracts? | Owns folder |
|---|---|---|---|
| **Pruthvik** | Wallet creation, adding money, account and username, autopay permissions, wallet demo video | No (uses Nivish's) | `features/account` |
| **Ujwal** | App shell, create circle, existing circles, invites, balance check, issues, resolution, "No issues", Finalized | **None** | `features/circle-setup` |
| **Nivish** | `MockUSDC`, `CircleFactory`, `PoolVault`, scheduler, pool screen | Yes | `features/pool`, `contracts/pool` |
| **Pranav** | `BiddingModule`, bid screens, 1-Click Reveal, winner payout | Yes | `features/bidding`, `contracts/bidding` |

**Not yours** (each person's "stay out" list):

| Person | Do NOT build |
|---|---|
| Pruthvik | Circle creation UI, invites, issues, pool or bidding logic, any fiat on-ramp |
| Ujwal | Any smart contract, wallet creation, autopay, pool, bidding |
| Nivish | Wallet/auth, circle setup UI, bidding logic, yield |
| Pranav | Pool/vault accounting, wallet/auth, circle setup UI, yield |

---

## 3. Repo, branches, folders

One Next.js repo, one folder per person. **Only the owner edits their folder.**

```
.
├── app/                         # Next.js app router: shell + routes (Ujwal creates in first 15 min)
├── features/
│   ├── account/                 # Pruthvik: UI, hooks, API route handlers for users + autopay
│   ├── circle-setup/            # Ujwal: UI, hooks, API route handlers for circles/invites/issues
│   ├── pool/                    # Nivish: pool screen, scheduler control UI
│   └── bidding/                 # Pranav: commit / reveal / results screens
├── contracts/
│   ├── pool/                    # Nivish: MockUSDC, CircleFactory, PoolVault, IPool.sol
│   └── bidding/                 # Pranav: BiddingModule, IBidding.sol, MockPool.sol (his own)
├── scripts/
│   ├── pool/                    # Nivish: deploy, fund demo accounts, mock session trigger, scheduler
│   └── bidding/                 # Pranav: deploy, test helpers
├── handoffs/                    # FROZEN files (section 4). Change only via PR + team notice
├── prisma/
│   └── schema.prisma            # one file; each person adds only their own models
├── deployments/
│   └── base-sepolia.json        # addresses written by deploy scripts
├── PRD.md
└── README.md
```

Branches: `main` (protected), `dev` (integration), and one per person: `pruthvik`, `ujwal`, `nivish`, `pranav` (sub-branches like `pranav/commit-reveal` are fine). Merge into `dev` at **Sync 1** and **Sync 2**. If the repo already contains files, adapt this layout to it instead of overwriting; show the plan first.

`prisma/schema.prisma` is shared by Pruthvik and Ujwal: each adds only their own models, in separate PRs, to avoid conflicts.

Suggested env vars (`.env`, never committed; commit `.env.example` with names only):

```
BASE_SEPOLIA_RPC_URL=
DATABASE_URL=
NEXT_PUBLIC_PRIVY_APP_ID=        PRIVY_APP_SECRET=
BUNDLER_URL=                     PAYMASTER_URL=
DEPLOYER_PRIVATE_KEY=            SCHEDULER_PRIVATE_KEY=
BASESCAN_API_KEY=
NEXT_PUBLIC_MOCK_USDC_ADDRESS=   NEXT_PUBLIC_FACTORY_ADDRESS=
DEV_LOGIN=true                   DEMO_MODE=true
```

---

## 4. Frozen hand-offs (drafts to freeze in Phase 0)

These are the only things slices share. The **owner finalizes** each draft in Phase 0 (about 45 minutes); after that, any change needs a team notice and the frozen file updated **in the same PR**. Put the final versions in `handoffs/`.

### 4.1 `UserProfile` + lookup API (Pruthvik -> Ujwal)

```ts
// handoffs/user-profile.ts
export type UserProfile = {
  username: string;       // unique, lowercase, contains the real name
  walletAddress: `0x${string}`; // smart account address (the on-chain identity)
  displayName: string;    // the real name as entered
};
```

Endpoints (Next.js route handlers):

| Method + path | Returns |
|---|---|
| `GET /api/users/search?q=<text>` | `UserProfile[]` (prefix/contains match on username, max 10) |
| `GET /api/users/by-username/:username` | `UserProfile` or 404 |
| `GET /api/users/by-wallet/:address` | `UserProfile` or 404 |
| `GET /api/session` | `UserProfile` of the logged-in user, or 401 |

Dev login: when `DEV_LOGIN=true`, a request header `x-dev-user: <username>` is accepted as that fixture user's session. Fixtures (`handoffs/fixtures/users.json`): 6 users with deterministic addresses, e.g. `asharao01`, `vikramnair02`, `meerajoshi03`, `rohandas04`, `kavyareddy05`, `arjunpatel06`.

### 4.2 `FinalizedCircle` (Ujwal -> Pruthvik, Nivish)

```ts
// handoffs/finalized-circle.ts
export type FinalizedCircle = {
  circleId: string;
  name: string;
  members: `0x${string}`[];     // wallet addresses, includes the volunteer
  monthlyAmount: string;        // base units, e.g. "1000000000"
  durationMonths: number;
  volunteer: `0x${string}`;
};
```

Published at `GET /api/circles/:id/finalized` (404 until status is `Finalized`). Sample files go in `handoffs/samples/finalized-circle.*.json` (for example 4 members x 3 months, 5 members x 4 months).

### 4.3 `IPool` + `pool.abi.json` (Nivish -> Pruthvik, Pranav)

```solidity
// contracts/pool/IPool.sol  (DRAFT, Nivish finalizes)
interface IPool {
    enum Phase { NotStarted, Collect, Bidding, Settle, Completed }

    // views used by the bidding module and UIs
    function currentCycle() external view returns (uint256);   // 1-based
    function phase() external view returns (Phase);
    function poolAmount() external view returns (uint256);     // contributions this cycle + dividend carried in
    function members() external view returns (address[] memory);
    function hasWon(address member) external view returns (bool);
    function hasMissed(address member) external view returns (bool); // added for the missed-payment rule (DEFAULT)

    // only callable by the bound bidding module
    function payout(address winner, uint256 amount) external;
    function creditDividend(uint256 totalDividend) external;

    event CircleStarted(uint256 startTime);
    event Contributed(uint256 indexed cycle, address indexed member, uint256 amount);
    event MemberMissed(uint256 indexed cycle, address indexed member);
    event PhaseChanged(uint256 indexed cycle, Phase phase);
    event PayoutSent(uint256 indexed cycle, address indexed winner, uint256 amount);
    event DividendCredited(uint256 indexed cycle, uint256 amount);
    event CycleSettled(uint256 indexed cycle);
}
```

Payout rule (A or B) is frozen **in the comments of this file** and in `handoffs/payout_vectors.json` (section 4.6).

### 4.4 `IBidding` + ABI (Pranav -> Nivish)

```solidity
// contracts/bidding/IBidding.sol  (DRAFT, Pranav finalizes)
interface IBidding {
    enum BidPhase { Closed, Commit, Reveal, Settled }
    struct BidView { address member; uint256 amount; bool revealed; uint64 committedAt; }

    function bidPhase() external view returns (BidPhase);
    function commitBid(bytes32 commitment) external;               // member
    function revealBid(uint256 bidAmount, bytes32 salt) external;  // member
    function openReveal() external;                                // scheduler: Commit -> Reveal
    function settle() external;                                    // scheduler: pick winner, pay out, credit dividend
    function bidList(uint256 cycle) external view returns (BidView[] memory); // amounts only after reveal
    function winnerOf(uint256 cycle) external view returns (address);

    event BidCommitted(uint256 indexed cycle, address indexed member);        // never emit the commitment contents
    event BidRevealed(uint256 indexed cycle, address indexed member, uint256 amount);
    event BidDiscarded(uint256 indexed cycle, address indexed member);        // committed, never revealed
    event WinnerSelected(uint256 indexed cycle, address indexed winner, uint256 amount);
    event NoBids(uint256 indexed cycle);
}
```

### 4.5 `autopay-policy.json` (Nivish -> Pruthvik)

```json
{
  "version": 1,
  "chainId": 84532,
  "token": "<MockUSDC address>",
  "destinationVault": "<per-circle PoolVault address, filled at runtime>",
  "allowedCalls": [
    { "target": "token", "function": "transfer(address,uint256)", "constraints": { "to": "destinationVault", "amountMax": "monthlyAmount" } },
    { "target": "destinationVault", "function": "recordContribution()" }
  ],
  "maxExecutionsPerCycle": 1,
  "validUntil": "circle end (start + durationMonths + grace)"
}
```

**Gap worth flagging:** `recordContribution()` is called in the same batch as the transfer, so the mandate must allow that second call too, even though the PDF only mentions the transfer. Nivish and Pruthvik confirm this in Phase 0.

### 4.6 `payout_vectors.json` (Nivish + Pranav jointly)

Shared test examples both contract suites must pass. Format:

```json
[
  { "name": "month 2, simple bid", "members": 5, "monthlyAmount": "1000000000",
    "cycle": 2, "carriedDividend": "0", "paid": 5, "winningBid": "3800000000",
    "expect": { "payout": "3800000000", "dividendCarried": "1200000000" } }
]
```

---

## 5. DEFAULT decisions (so agents never stall)

These fill gaps in the split file. They are **placeholders**: the team can change any of them in Phase 0, and then this table must be updated.

| # | Gap | DEFAULT |
|---|---|---|
| D1 | Is the volunteer one of the N people? | Yes. Invites needed = N - 1 |
| D2 | Payout rule A vs B (Nivish + Pranav) | **Not decided here.** `PoolVault` takes a `payoutRule` (A or B) set at creation; tests run for both until frozen. Rule A: volunteer gets the Round 1 pot, no discount, bidding from Round 2. Rule B: circle dissolves early after N-1/N-2 rounds, remaining balance split |
| D3 | Bid floor | `MIN_BID_BPS = 5000` (50% of the pool), a constant in `BiddingModule` |
| D4 | No-bids fallback | **Rollover:** no payout this cycle, the whole pool is credited as dividend into the next cycle |
| D5 | Missed payment | Member flagged (`hasMissed`), that month's pool is reduced by their share, they can no longer bid |
| D6 | Rejected invite | Volunteer may invite someone else for the same slot |
| D7 | Who calls `createCircle` after `Finalized` | The **volunteer's wallet**, as the first step of Pruthvik's autopay screen. The vault address must exist before mandates are created |
| D8 | Who may call `PoolVault.start()` | Only the volunteer (the `createCircle` caller). Pruthvik's UI calls it when all mandates exist |
| D9 | How `BiddingModule` is bound to a vault | One `BiddingModule` per circle, constructed with the vault address. The volunteer calls `PoolVault.setBiddingModule(address)` once, right after creation. Demo deploy script does both |
| D10 | New issue after some members pressed "No issues" | The new issue clears all "No issues" confirmations and the circle returns to resolving |
| D11 | Phase windows | `collectWindow` and `biddingWindow` (commit + reveal) are constructor params with factory defaults; demo mode uses minutes and the scheduler HOLDs between steps |
| D12 | Demo video pop-up on first visit | Pruthvik records the video; Ujwal's shell shows it in a modal using a file Pruthvik drops in `public/demo/` |

---

## 6. Global Context Block (paste first, in every agent session)

```
PROJECT: ChitChain (working title), a decentralized chit fund prototype. Network: Base Sepolia (chainId 84532); Anvil for local. Token: MockUSDC, 6 decimals, public mint. All amounts are integers in base units (bigint/string), never floats.

FLOW: wallet + add money -> account (unique username containing real name, bound to wallet public key) -> home (Create a circle / Are you existing in a circle) -> volunteer sets name, number of people N, amount per month, duration (must be N-1 or N-2 months) -> adds people by username -> 3-month balance check (invitee balance >= 3 x monthly amount) -> invite "You were added to [CIRCLE NAME] by [VOLUNTEER]. Verify whether you want to join." -> volunteer sees Pending/Accepted/Rejected -> when all joined, members raise issues (number of people / duration / amount / the people joined) with comments -> volunteer resolves all, every member presses "No issues" -> circle Finalized -> every member gives autopay permission -> pool collected on the 1st of each month -> secret commit-reveal bidding, first bid at end of month 1 -> lowest valid bid wins, payout, dividend carried to next month's pool.

TEAM SLICES (one owner each, vertical slices):
- Pruthvik: wallet (Privy + Biconomy smart account + paymaster), add money (MockUSDC faucet), account + username, user API, autopay permissions (Rhinestone SmartSession), wallet demo video. Folder: features/account.
- Ujwal: app shell + routing, home, create circle, invites, balance check, join requests, issues, resolution, "No issues", Finalized. NO smart contracts. Folder: features/circle-setup.
- Nivish: MockUSDC, CircleFactory, PoolVault (IPool), mock session trigger, scheduler (with demo HOLD), pool screen. Folders: contracts/pool, scripts/pool, features/pool.
- Pranav: BiddingModule (IBidding), commit-reveal, bid screens, 1-Click Reveal (demo), payout settle. Folders: contracts/bidding, scripts/bidding, features/bidding.

HAND-OFFS (frozen files in handoffs/): UserProfile + user lookup API (Pruthvik->Ujwal), FinalizedCircle (Ujwal->Pruthvik,Nivish), IPool + pool.abi.json + autopay-policy.json (Nivish->Pruthvik,Pranav), IBidding + ABI (Pranav->Nivish), payout_vectors.json (Nivish+Pranav). Never change one without telling the team and updating the frozen file in the same PR. The full drafts are in README.md section 4; DEFAULT decisions are in README.md section 5.

RULES FOR YOU (THE AGENT):
1. Work only in the owner's folders listed above. Never edit another person's folder or a frozen hand-off file; if one must change, stop and tell me.
2. First write a short plan (files to create, order, tests). Wait for my OK before editing.
3. Until a real dependency exists, use the agreed mock. Do not build the other person's slice.
4. Stack is fixed by the owner's section in README.md. Do not add libraries without asking.
5. Out of scope, do not build: fiat on-ramps, DeFi yield, locked reserves/staking, SMS/WhatsApp/push, indexers (The Graph), IPFS, Chainlink, separate backend services, i18n/PWA. Notifications are in-app only.
6. Secrets only in .env. Never commit keys. Commit small, on my branch. Run the tests/linters for what you changed and show me the output.
7. When finished with a step, list what you did, what you did not do, and any assumption you made.
```

---

# 7. PRUTHVIK: Wallet, Account, Autopay Permissions

**Branch:** `pruthvik` | **Folder:** `features/account` (+ `app/api/users`, `app/api/autopay`) | **Stack:** Next.js + TypeScript, Privy React Auth, Biconomy SDK, Rhinestone module SDK, wagmi + viem, Tailwind + shadcn/ui, PostgreSQL + Prisma, zod.

### 7.1 Mission
Give every user a gasless smart-account wallet with test money, a unique real-name username bound to it, and later a safe, scoped autopay permission for their circle. You also publish the user lookup API that Ujwal depends on.

### 7.2 Deliverables
- [ ] User lookup API + fixtures + dev login (**Phase 0**)
- [ ] Wallet creation + add money working; **demo video recorded**
- [ ] Username rule + unique accounts
- [ ] Autopay permission step working with the mock session on Anvil, then on Base Sepolia

### 7.3 Screens

| Route | What it does |
|---|---|
| `/account/login` | Privy login (email/phone) or "connect existing wallet"; creates the Biconomy smart account |
| `/account/wallet` | Shows the **smart account address** (the public key), MockUSDC balance, "Add money" button |
| `/account/create` | Real name + username form with live validation; submit binds account to wallet |
| `/circles/[id]/autopay` | Per-member status (Not given / Given), "Give permission" button, "Revoke" button; first step for the volunteer is creating the vault (DEFAULT D7); calls `start()` when all have given |

### 7.4 Data model (add to `prisma/schema.prisma`)

```prisma
model User {
  id            String   @id @default(cuid())
  privyUserId   String?  @unique
  walletAddress String   @unique   // smart account address, lowercase
  ownerAddress  String?            // embedded wallet EOA, for reference
  displayName   String             // real name as entered
  username      String   @unique   // lowercase
  createdAt     DateTime @default(now())
}

model AutopayConsent {
  id            String   @id @default(cuid())
  circleId      String
  memberAddress String
  status        String   // NOT_GIVEN | GIVEN | REVOKED
  sessionId     String?
  txHash        String?
  grantedAt     DateTime?
  revokedAt     DateTime?
  @@unique([circleId, memberAddress])
}
```

### 7.5 Username rule (exact)

```ts
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// valid if: norm(username) includes norm(realName) AND norm(username).length > norm(realName).length
// (the rule is "username = name + something")
```
Uniqueness is enforced **on the server** (unique index + friendly error). Usernames are stored lowercase.

### 7.6 Build order and checks

| Step | Build | Check |
|---|---|---|
| 1 | **2-hour spike:** Privy embedded wallet -> Biconomy smart account -> paymaster -> a sponsored `mint` on Base Sepolia; then an install + use of a Rhinestone SmartSession on that account | Written `SPIKE.md`: works / fallback chosen |
| 2 | User API + Prisma `User` + fixtures + dev login (Phase 0) | Ujwal can call all four endpoints with fixtures |
| 3 | Wallet screens + Add money (faucet: `MockUSDC.mint(wallet, 1000e6)`, gasless) | Balance updates after clicking |
| 4 | Account creation + username rule + uniqueness | Rejects a username missing the name; rejects duplicates |
| 5 | Autopay step against Nivish's stub vault on Anvil | Mandate installed; a scoped transfer works; an out-of-scope transfer is rejected |
| 6 | Revoke + status display + `start()` call | After revoke, the transfer fails; `start()` only fires when all members are Given |
| 7 | Switch to Base Sepolia contracts, record demo video | Full run in Sync 2 |

### 7.7 Edge cases
- Wallet already bound to a username: block creating a second account.
- Smart account not yet deployed on first use: first sponsored transaction deploys it.
- Mandate scope: per `autopay-policy.json` (token transfer to this circle's vault, at most the monthly amount, once per cycle, expiring at circle end, plus `recordContribution()` on the vault).
- If the spike fails: fall back to a **pre-funded smart account that sends the monthly transfer**; keep the same screens.

### 7.8 Antigravity prompts (paste in order, after the Global Context Block)

**P1: Spike + Phase 0 hand-off**
```
You are working for PRUTHVIK on branch `pruthvik`, folder features/account.
Task: (1) Write handoffs/user-profile.ts and the four user API route handlers (search, by-username, by-wallet, session) per README.md section 4.1, plus handoffs/fixtures/users.json with 6 deterministic fixture users and dev login via the `x-dev-user` header when DEV_LOGIN=true. Use an in-memory fixture store for now; no database yet.
(2) Run a 2-hour spike and write features/account/SPIKE.md: Privy embedded wallet -> Biconomy smart account on Base Sepolia -> paymaster-sponsored MockUSDC.mint -> install and use a Rhinestone SmartSession on that account. Record exact package names/versions that work, and say clearly WORKS or USE FALLBACK (pre-funded smart account sending the monthly transfer).
Plan first, wait for my OK. Done when: Ujwal could call all four endpoints with fixtures, and SPIKE.md exists with a clear verdict.
```

**P2: Wallet + add money**
```
Continue as PRUTHVIK. Build /account/login and /account/wallet per README.md section 7.3: Privy login (email/phone) or connect existing wallet, create the Biconomy smart account, show the smart account address as the user's public key, show MockUSDC balance, and an "Add money" button that gasless-mints 1000 MockUSDC (6 decimals) via the faucet. Use wagmi + viem, Tailwind + shadcn/ui. If SPIKE.md says USE FALLBACK, implement the fallback instead and explain. Done when: a new user can log in, see their address, click Add money, and see the balance increase on Base Sepolia (or Anvil if the token is not deployed yet), without holding testnet ETH.
```

**P3: Account + username + real database**
```
Continue as PRUTHVIK. Add the Prisma User model from README.md section 7.4 and replace the in-memory fixture store with Postgres while keeping fixtures for dev login. Build /account/create: real name + username form, live validation using exactly the rule in section 7.5, uniqueness enforced on the server with a clear error, account bound to the logged-in wallet address, one account per wallet. Keep the four user API endpoints and the UserProfile shape unchanged. Add zod validation and unit tests for the username rule (accepts "asharao01" for "Asha Rao", rejects "ashok", rejects exactly "asharao", rejects duplicates). Done when: tests pass and Ujwal's calls still work unchanged.
```

**P4: Autopay permission step**
```
Continue as PRUTHVIK. Build /circles/[id]/autopay per README.md sections 7.3 and 4.5. Read the FinalizedCircle sample from handoffs/samples (Ujwal's) and the vault ABI/policy from handoffs (Nivish's; if missing, use a stub contract on Anvil). Flow: (a) the volunteer's first action is creating the vault via CircleFactory.createCircle(members, monthlyAmount, durationMonths, token) and recording the vault address (DEFAULT D7); (b) each member signs one EIP-712 message that installs a Rhinestone SmartSession mandate allowing ONLY token.transfer(vault, <= monthlyAmount) and vault.recordContribution(), once per cycle, valid until circle end; (c) show per-member status Not given / Given and a Revoke button; (d) when every member is Given, the volunteer's wallet calls vault.start(). Add the AutopayConsent model. Test on Anvil with Nivish's mock session-trigger script if available. Done when: a scoped transfer works, an out-of-scope one is rejected, revoke blocks further transfers, and start() fires only when all are Given.
```

**P5: Integration + demo video**
```
Continue as PRUTHVIK. Switch to the real Base Sepolia addresses from deployments/base-sepolia.json, run the full flow with fixtures replaced by real accounts, fix field-name/event mismatches found at Sync 1, and write a step-by-step storyboard for the wallet demo video (wallet creation, account creation, adding money) in features/account/DEMO_VIDEO.md. Put the final video file path in public/demo/ for Ujwal's modal (DEFAULT D12). Done when: the Sync 2 run reaches "autopay given by all, start() called" on Base Sepolia.
```

---

# 8. UJWAL: Create a Circle, Existing Circles, Issues

**Branch:** `ujwal` | **Folder:** `features/circle-setup` (+ `app/` shell, `app/api/circles`) | **Stack:** Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, wagmi + viem (balance read), TanStack Query, PostgreSQL + Prisma (Next.js API routes), zod, msw. **No smart contracts.**

### 8.1 Mission
Everything from the home screen up to "everyone submitted No issues", ending with a published `FinalizedCircle`. You also create the empty app shell in the first 15 minutes of Phase 0 so everyone has routing.

### 8.2 Deliverables
- [ ] App shell and routing (first 15 min)
- [ ] `FinalizedCircle` sample files (Phase 0)
- [ ] Create circle, invites, balance check working against fixtures
- [ ] Issue and resolution flow working
- [ ] Finalized circle published

### 8.3 Screens

| Route | What it does |
|---|---|
| `/` (home) | Two big options: **Create a circle** and **Are you existing in a circle** |
| `/circles` | List of the user's circles with status, member count, monthly amount |
| `/circles/new` | Create form: name, number of people, amount per month, duration, with live validation |
| `/circles/[id]` | Circle page. Volunteer view: invite panel (username search, add), **status board** (Pending / Accepted / Rejected). Member view: details. Shows the stage (Inviting, Issue stage, Finalized) |
| `/circles/[id]/issues` | Issue stage: raise issue, list of issues, volunteer's resolve box, **No issues** button |
| Notification bell | In-app notifications; join request with Accept / Reject |

Hand-off links: `/circles/[id]/autopay` is Pruthvik's route; `/circles/[id]/pool` is Nivish's; `/circles/[id]/bidding` is Pranav's. You only provide the links and the shell.

### 8.4 Validation (exact)

```ts
// N = number of people, D = duration in months, A = monthly amount (base units)
A > 0n
N >= 2
D >= 1 && (D === N - 1 || D === N - 2)
// error copy: "Duration must be N-1 or N-2 months for this circle size."
```

### 8.5 Data model (add to `prisma/schema.prisma`)

```prisma
model Circle {
  id               String   @id @default(cuid())
  name             String
  volunteerWallet  String
  numPeople        Int
  monthlyAmount    String          // base units
  durationMonths   Int
  status           String          // INVITING | ISSUE_STAGE | FINALIZED
  vaultAddress     String?         // filled after Pruthvik's createCircle step
  createdAt        DateTime @default(now())
  finalizedAt      DateTime?
}

model Invite {
  id             String   @id @default(cuid())
  circleId       String
  inviteeWallet  String
  inviteeUsername String
  status         String          // PENDING | ACCEPTED | REJECTED
  balanceAtCheck String          // base units, for the record
  createdAt      DateTime @default(now())
  respondedAt    DateTime?
  @@unique([circleId, inviteeWallet])
}

model Issue {
  id                 String   @id @default(cuid())
  circleId           String
  authorWallet       String
  category           String      // PEOPLE_COUNT | DURATION | AMOUNT | PEOPLE_JOINED
  targetMemberWallet String?     // only for PEOPLE_JOINED
  comment            String      // required
  status             String      // OPEN | RESOLVED
  resolutionResponse String?
  createdAt          DateTime @default(now())
  resolvedAt         DateTime?
}

model NoIssueConfirmation {
  circleId     String
  memberWallet String
  confirmedAt  DateTime @default(now())
  @@id([circleId, memberWallet])
}

model Notification {
  id         String   @id @default(cuid())
  userWallet String
  type       String      // JOIN_REQUEST | INVITE_ACCEPTED | INVITE_REJECTED | ISSUE_RAISED | ISSUE_RESOLVED | FINALIZED
  circleId   String
  body       String
  readAt     DateTime?
  createdAt  DateTime @default(now())
}
```

### 8.6 API routes (Next.js route handlers)

| Route | Purpose |
|---|---|
| `POST /api/circles` | Create (volunteer = session user), validates 8.4 |
| `GET /api/circles/mine` | Circles the session user is in or invited to |
| `GET /api/circles/:id` | Circle + members + invite statuses |
| `POST /api/circles/:id/invites` | Body `{ username }`; runs the balance check; creates invite + notification |
| `POST /api/invites/:id/respond` | Body `{ accept: boolean }`; when accepted + volunteer == N -> `ISSUE_STAGE` |
| `POST /api/circles/:id/issues` | Body `{ category, targetMemberWallet?, comment }`; comment required |
| `GET /api/circles/:id/issues` | List |
| `POST /api/issues/:id/resolve` | Volunteer only; body `{ response }` |
| `POST /api/circles/:id/no-issues` | Member confirms; only if zero OPEN issues |
| `GET /api/circles/:id/finalized` | `FinalizedCircle` or 404 |
| `GET /api/notifications`, `POST /api/notifications/:id/read` | In-app notifications |

### 8.7 The balance check (exact)

Before creating an invite, read `MockUSDC.balanceOf(inviteeWallet)` with a viem public client (read-only). Require `balance >= 3n * monthlyAmount`. If it fails: **send nothing**, return a clear reason such as "[username] holds 400 USDC; needs at least 3,000 USDC (3 x monthly amount)". Store `balanceAtCheck`.

### 8.8 Build order and checks

| Step | Build | Check |
|---|---|---|
| 1 | App shell, routing, layout, auth wrapper using Pruthvik's session (dev login at first), msw mocks for the user API, `FinalizedCircle` sample JSONs | Every teammate's route renders inside the shell |
| 2 | Home + create circle form + validation + Prisma `Circle` | N=5 accepts D=4 or 3, rejects D=2 and D=5 |
| 3 | Invite flow + balance check + notifications + status board | Invitee under 3x monthly cannot be invited; accept/reject updates the board |
| 4 | Issue stage, resolution, No issues | Stage starts when all N are in; No issues disabled while any issue is open |
| 5 | Finalize + publish `FinalizedCircle` | Endpoint returns 404 before, valid JSON after |
| 6 | Swap msw/fixtures for Pruthvik's real API | Same screens work unchanged |

### 8.9 Edge cases
- Inviting yourself, inviting someone twice, inviting after the circle is full: block with a clear message.
- Rejected invite: volunteer may invite someone else for the slot (DEFAULT D6).
- A new issue after some members pressed No issues: clears confirmations (DEFAULT D10).
- Only the volunteer can resolve; only members can raise issues or press No issues.
- Number of people reached = volunteer + accepted invites (DEFAULT D1).

### 8.10 Antigravity prompts

**P1: Shell, schema, samples (do this in the first 15 minutes)**
```
You are working for UJWAL on branch `ujwal`. Inspect the repo first and adapt to what exists. Create the empty Next.js (App Router, TypeScript, Tailwind, shadcn/ui) app shell and routing per README.md section 3 and 8.3: routes for /, /circles, /circles/new, /circles/[id], /circles/[id]/issues, plus placeholder pages for /account/*, /circles/[id]/autopay, /circles/[id]/pool, /circles/[id]/bidding that teammates will fill. Add a layout with nav and a notification bell placeholder. Create the folders in section 3, an empty prisma/schema.prisma, handoffs/finalized-circle.ts (README section 4.2), and 3 sample files in handoffs/samples/ (4 members x 3 months, 5 x 4, 3 x 2). Set up msw to mock Pruthvik's user API (README 4.1) with the 6 fixture users, and dev login via the x-dev-user header.
Plan first, wait for my OK. Done when: pnpm dev serves all routes and the shell shows the logged-in fixture user.
```

**P2: Home + create circle**
```
Continue as UJWAL. Build the home screen (Create a circle / Are you existing in a circle), /circles list, and /circles/new with the form and exact validation from README.md section 8.4. Add the Prisma Circle model (section 8.5) and POST /api/circles + GET /api/circles/mine. Amounts are entered in USDC and stored as base-unit strings (6 decimals). Show live helper text: required invites (N-1), required balance per invitee (3 x monthly). Write unit tests for the validation function including N=2 edge cases. Done when: N=5 accepts D=4 and D=3 only, and created circles appear in the list with status INVITING.
```

**P3: Invites, balance check, notifications**
```
Continue as UJWAL. Build the invite flow per README.md sections 8.3 to 8.7: username search through the user API (search endpoint), add person, run the on-chain balance check exactly as in 8.7 (viem read of MockUSDC.balanceOf, require >= 3x monthly, otherwise send nothing and show the reason), create the Invite and a Notification with the exact text "You were added to [CIRCLE NAME] by [VOLUNTEER]. Verify whether you want to join." with Accept and Reject. Build the volunteer's status board (Pending / Accepted / Rejected), the notification bell, and POST /api/invites/:id/respond. When the volunteer plus accepted invitees equals N, set the circle to ISSUE_STAGE. If MockUSDC is not deployed yet, use a local mock token on Anvil. Done when: an under-funded candidate is blocked with a clear reason, accepted/rejected states update the board, and the circle flips to ISSUE_STAGE automatically.
```

**P4: Issues, resolution, finalize**
```
Continue as UJWAL. Build the issue stage per README.md 8.3, 8.5, 8.6, 8.9: members raise issues on PEOPLE_COUNT, DURATION, AMOUNT, or PEOPLE_JOINED (shows the member list, pick whom, add comment); every issue requires a comment; members may submit multiple issues. The volunteer resolves each issue with a response. A "No issues" button is enabled only when there are zero OPEN issues; a new issue clears all confirmations (DEFAULT D10). When all members have confirmed, set status FINALIZED, set finalizedAt, and expose GET /api/circles/:id/finalized returning exactly the FinalizedCircle shape from README 4.2 (members include the volunteer). Send notifications for raised/resolved/finalized. Done when: the endpoint returns 404 before finalization and valid JSON after, and a test covers the clear-confirmations rule.
```

**P5: Integration**
```
Continue as UJWAL. Replace the msw mocks with Pruthvik's real user API and real session, use the real MockUSDC address from deployments/base-sepolia.json for the balance read, add links from a Finalized circle to /circles/[id]/autopay, and show the stage badge across screens. Fix any field-name mismatches found at Sync 1. Add the first-visit demo video modal using the file Pruthvik places in public/demo/ (DEFAULT D12), remembering dismissal. Done when: a Finalized circle created on the real stack is read correctly by Pruthvik's and Nivish's code.
```

---

# 9. NIVISH: Pooling Money

**Branch:** `nivish` | **Folders:** `contracts/pool`, `scripts/pool`, `features/pool` | **Stack:** Solidity 0.8.x, Foundry, OpenZeppelin 5.x (Clones, SafeERC20, ReentrancyGuard), viem + Node/tsx (scheduler), Next.js component for the pool screen.

### 9.1 Mission
Hold the money and run the monthly pooling cycle. You own the token, the factory, the per-circle vault, the scheduler that moves the cycle forward, and the pool screen. You and Pranav agree **one payout rule** in Phase 0.

### 9.2 Deliverables
- [ ] `IPool` and `autopay-policy.json` frozen (Phase 0), payout rule agreed with Pranav
- [ ] Stub pool + `MockUSDC` on Anvil **within 2 hours**
- [ ] Full `PoolVault` and factory tested, deployed to Base Sepolia (verified on Basescan)
- [ ] Mock session-trigger script
- [ ] Scheduler with demo HOLD control

### 9.3 Contracts

**`MockUSDC`**: ERC20, 6 decimals, `mint(address to, uint256 amount)` public. Script to fund demo accounts.

**`CircleFactory`**
```solidity
function createCircle(address[] calldata members, uint256 monthlyAmount, uint256 durationMonths, address token)
    external returns (address vault);   // clones PoolVault; msg.sender becomes the volunteer
event CircleCreated(address indexed vault, address indexed volunteer, address[] members, uint256 monthlyAmount, uint256 durationMonths);
```
Factory-level defaults for `collectWindow`, `biddingWindow`, and `payoutRule` (owner-settable for demo).

**`PoolVault`** (one clone per circle, implements `IPool`)

| Function | Rule |
|---|---|
| `initialize(...)` | One-time; stores members, amounts, volunteer, token, windows, payout rule |
| `setBiddingModule(address)` | Once, volunteer only (DEFAULT D9) |
| `start()` | Volunteer only; requires state `NotStarted`; begins cycle 1 in `Collect`; emits `CircleStarted` |
| `recordContribution()` | Called by a member's smart account **in the same batch as its token transfer**. Requires phase `Collect`, caller is a member, not yet paid this cycle, and `token.balanceOf(this) >= accountedBalance + monthlyAmount`; then `accountedBalance += monthlyAmount`, marks paid, emits `Contributed` |
| `collect()` | Anyone, after the collection window: marks every non-payer missed (`MemberMissed`, `hasMissed`), computes `poolAmount()`, moves `Collect -> Bidding` |
| `payout(winner, amount)` | Only the bidding module; requires phase `Bidding`; `amount <= poolAmount()`; transfers tokens; sets `hasWon[winner]` |
| `creditDividend(total)` | Only the bidding module; adds to the carry for the next cycle (no token movement, the money is already in the vault) |
| `settle()` | Anyone, after the bidding module has settled: `Bidding -> Settle -> next cycle Collect`; after the last cycle -> `Completed` |

`poolAmount()` = contributions this cycle + dividend carried in. **No `transferFrom` pulling anywhere**: money only arrives through members' autopay mandates.

**Month 1:** pool collected on the 1st, first bidding at the end of that month (subject to payout rule A/B).

**Payout rule A/B** (decide with Pranav in Phase 0, DEFAULT D2): A = volunteer receives the Round 1 pot with no discount, bidding starts in Round 2. B = circle dissolves early after N-1/N-2 rounds, remaining balance split. Implement behind a `payoutRule` value set at creation; both test suites must pass the same `payout_vectors.json`.

**Missed payment (DEFAULT D5):** flagged, pool reduced by their share, cannot bid.

### 9.4 Scheduler (`scripts/pool/scheduler.ts`)

Node + viem. Watches vault state and calls, in order: `collect()` -> (bidding module's) `openReveal()` -> `settle()` on the bidding module -> vault `settle()`.
- **Real mode:** uses real windows (1st of month etc.).
- **Demo mode (`DEMO_MODE=true`):** short windows (minutes) and **HOLD** between bidding, reveal and settle until the admin clicks **Continue**, so nothing times out in front of judges. Expose a tiny local HTTP control (`POST /continue`, `GET /state`) that the pool screen's admin panel calls.
- Idempotent and retry-safe; logs every action.

### 9.5 Mock session-trigger (`scripts/pool/session-trigger.ts`)
On Anvil, impersonate each member and run `token.transfer(vault, monthlyAmount)` + `vault.recordContribution()`. Option `--skip <member>` to simulate a missed payment. Pruthvik and Pranav use this to test without real mandates.

### 9.6 Pool screen (`features/pool`)
Pool amount, month calendar (pool date, bid date), who has paid this month, current phase, and (demo mode) the admin **Continue** panel.

### 9.7 Build order and checks

| Step | Build | Check |
|---|---|---|
| 1 | Phase 0: finalize `IPool.sol`, `autopay-policy.json`; agree payout rule + `payout_vectors.json` with Pranav | Files frozen in `handoffs/` |
| 2 | **Within 2 hours:** `MockUSDC` + stub vault on Anvil (fixed members, `poolAmount()`, `payout()`) | Pruthvik and Pranav can compile against it |
| 3 | Full `PoolVault` + `CircleFactory` + tests | `forge test` green incl. payout vectors, missed payment, only-bidding-module guards, balance-growth check |
| 4 | Mock session trigger + funding script | One circle collects a full cycle on Anvil |
| 5 | Scheduler with demo HOLD, against Pranav's mock/real `IBidding` | A full month runs hands-free in demo mode, pauses at each HOLD |
| 6 | Pool screen | Matches on-chain state |
| 7 | Deploy to Base Sepolia, verify, write `deployments/base-sepolia.json` | Addresses visible on Basescan |

### 9.8 Antigravity prompts

**P1: Phase 0 files + 2-hour stub**
```
You are working for NIVISH on branch `nivish`, folders contracts/pool, scripts/pool, features/pool. Use Foundry + OpenZeppelin 5.x.
Task: (1) Finalize contracts/pool/IPool.sol from README.md section 4.3 and handoffs/autopay-policy.json from 4.5 (remember the policy must also allow vault.recordContribution()); export pool.abi.json to handoffs/. (2) Write MockUSDC (6 decimals, public mint) and a STUB vault on Anvil implementing IPool with fixed members, a fixed poolAmount, and payout()/creditDividend() that just record calls, plus a deploy script and a script that funds demo accounts. (3) Draft handoffs/payout_vectors.json with 6 vectors for rules A and B (README section 4.6) and put the rule in IPool.sol comments, marked "PENDING agreement with Pranav".
Plan first, wait for my OK. Done when: the stub deploys on Anvil and forge build is clean; this must be ready within 2 hours of starting.
```

**P2: Factory + vault**
```
Continue as NIVISH. Build CircleFactory and PoolVault exactly per README.md section 9.3: minimal-proxy clones (OpenZeppelin Clones), initialize, setBiddingModule (once, volunteer only), start (volunteer only), recordContribution (checks the vault's token balance grew by monthlyAmount using an accountedBalance counter), collect (marks non-payers, hasMissed, sets pool, Collect->Bidding), payout and creditDividend (onlyBiddingModule), settle (cycle advance, Completed after the last cycle), payout rule A/B behind a payoutRule value. Use SafeERC20, ReentrancyGuard, custom errors, events from IPool. No transferFrom pulling. Write Foundry tests: happy path for 4 members x 3 months, missed payment, double contribution blocked, non-member blocked, only-bidding-module guards, carry-forward of dividend, and every vector in handoffs/payout_vectors.json for the active rule. Done when: forge test is green and coverage report is attached.
```

**P3: Mock trigger + scheduler**
```
Continue as NIVISH. Write scripts/pool/session-trigger.ts (Anvil: impersonate each member, token.transfer(vault, monthlyAmount) then vault.recordContribution(), flag --skip <member>) and scripts/pool/scheduler.ts per README.md sections 9.4 and 9.5 using viem + tsx. The scheduler calls vault.collect(), then the bidding module's openReveal(), then the bidding module's settle(), then vault.settle(), with real mode and DEMO_MODE (short windows, HOLD before reveal and before settle until POST /continue is received; GET /state returns the current phase and what it is waiting for). Until Pranav's IBidding exists, use a mock bidding caller script that calls payout() and creditDividend() on the vault. Done when: a full month runs on Anvil in demo mode and pauses correctly at each HOLD.
```

**P4: Pool screen + deploy**
```
Continue as NIVISH. Build features/pool and the route /circles/[id]/pool per README.md section 9.6: pool amount, a month calendar showing pool date and bid date for each cycle, who has paid this month (from Contributed/MemberMissed events), current phase, and in demo mode an admin panel with a Continue button calling the scheduler's POST /continue. Read amounts as base-unit bigint and format with 6 decimals. Then write the Base Sepolia deploy script for MockUSDC and CircleFactory, verify on Basescan, and write deployments/base-sepolia.json. Done when: the screen matches on-chain state on Anvil and the contracts are verified on Base Sepolia.
```

**P5: Integration**
```
Continue as NIVISH. Replace the mock bidding caller with Pranav's real IBidding ABI (handoffs/). Fix event/field mismatches from Sync 1. Confirm with Pruthvik that the real mandate covers token.transfer to the vault and vault.recordContribution(), then run the complete cycle on Base Sepolia with real autopay: collect -> bidding -> reveal -> settle -> next collect with the dividend carried. Done when: two consecutive months complete on Base Sepolia in demo mode.
```

---

# 10. PRANAV: Bidding Process

**Branch:** `pranav` | **Folders:** `contracts/bidding`, `scripts/bidding`, `features/bidding` | **Stack:** Solidity 0.8.x, Foundry, OpenZeppelin 5.x, Next.js + wagmi/viem for the bid screens.

### 10.1 Mission
Secret bidding, winner selection and payout. You own the bidding contract, its screens, and the demo-mode 1-Click Reveal that guarantees no auction ever stalls on a lost salt.

### 10.2 Deliverables
- [ ] `IBidding` ABI stub (**within 2 hours**)
- [ ] Commit-reveal tested against `MockPool`
- [ ] Bidding screens + 1-Click Reveal
- [ ] Deployed to Base Sepolia (verified on Basescan)

### 10.3 `BiddingModule` spec

One module per circle, constructed with the vault address (DEFAULT D9). Reads `currentCycle()`, `phase()`, `poolAmount()`, `members()`, `hasWon()`, `hasMissed()` from `IPool`.

| Function | Rule |
|---|---|
| `commitBid(bytes32 c)` | Phase `Bidding` + `BidPhase.Commit`; caller is a member, not `hasWon`, not `hasMissed`; one commit per member per cycle (an overwrite policy must be explicit: **not allowed**); records timestamp. `c = keccak256(abi.encodePacked(bidAmount, salt, msg.sender))`. Emits `BidCommitted` without contents |
| `openReveal()` | Scheduler; `Commit -> Reveal` |
| `revealBid(amount, salt)` | `BidPhase.Reveal`; must match the stored commitment; `amount >= floor` and `amount <= poolAmount()`; else revert. Emits `BidRevealed` |
| `settle()` | Scheduler; discard unrevealed commits (`BidDiscarded`); winner = **lowest valid bid, ties go to the earliest commit**; call `IPool.payout(winner, bid)` and `IPool.creditDividend(pool - bid)`; set `BidPhase.Settled` |
| `bidList(cycle)` | Amounts visible **only after reveal** (before: unrevealed entries show no amount); also emitted as events |
| No bids (DEFAULT D4) | Rollover: no payout, `creditDividend(pool)`, emit `NoBids` |
| Floor (DEFAULT D3) | `MIN_BID_BPS = 5000` of `poolAmount()` |

Hard rules: **no bid readable before reveal** (state, events, logs); a member who already won cannot win again; payout never exceeds the pool.

### 10.4 Screens (`features/bidding`, route `/circles/[id]/bidding`)

| State | Screen |
|---|---|
| Commit open | Commit screen: enter bid (validated against floor and pool), generate salt, send `commitBid`, save `{bid, salt}` locally |
| Committed, waiting | "Waiting for reveal" screen with "x of y committed" (counts only, never amounts) |
| Reveal open | Reveal screen with a **clear warning that unrevealed bids are discarded**; reveal button uses the saved bid and salt |
| Settled | Results: full bid list, the winner, the winning bid, dividend carried; shows "lowest valid bid" as the reason (and tie-break/rollover reasons when they apply) |
| Already won | "You've already received your payout" |

### 10.5 1-Click Reveal (demo mode only, `DEMO_MODE=true`)
The salt is **derived**, not random: `salt = keccak256(signature of the fixed message "ChitChain bid | circleId | cycle | memberAddress")`. The bid is saved locally. One click re-derives the salt from the wallet signature and calls `revealBid`, so a lost local salt can never stall the auction. Confirm in the spike that the smart account's signatures are deterministic (ECDSA validator is); otherwise derive from the embedded wallet's signature.

### 10.6 Tests (Foundry)
- Hidden bids stay hidden (no getter, no event leaks the amount before reveal)
- Wrong salt fails; wrong amount fails; reveal outside window fails
- Below floor and above pool rejected
- Lowest bid wins; tie goes to earliest commit; no double win; missed members cannot bid
- Unrevealed commits discarded; no-bids rollover
- Payout never exceeds the pool (fuzz)
- Same `payout_vectors.json` as Nivish, run against `MockPool`

### 10.7 Build order and checks

| Step | Build | Check |
|---|---|---|
| 1 | **Within 2 hours:** `IBidding.sol` (README 4.4) + ABI to `handoffs/`; your own `MockPool` (fixed members, fixed pool, `payout()` records the call) | Nivish can compile his scheduler against it |
| 2 | `BiddingModule` + tests against `MockPool` | `forge test` green incl. fuzz |
| 3 | Bid screens against a local Anvil with `MockPool` and a local test wallet | Full commit -> reveal -> results flow |
| 4 | 1-Click Reveal | Deleting local salt storage still reveals in one click |
| 5 | Integrate with Nivish's real `PoolVault` and Pruthvik's wallet | Works end to end on Anvil, then Base Sepolia |
| 6 | Deploy script (module per circle + `setBiddingModule`), verify on Basescan | Verified contract links |

### 10.8 Antigravity prompts

**P1: IBidding stub + MockPool (2 hours)**
```
You are working for PRANAV on branch `pranav`, folders contracts/bidding, scripts/bidding, features/bidding. Use Foundry + OpenZeppelin 5.x.
Task: write contracts/bidding/IBidding.sol from README.md section 4.4 and export its ABI to handoffs/ (IBidding.abi.json); write contracts/bidding/MockPool.sol implementing IPool (README 4.3) with fixed members, fixed poolAmount, settable phase/cycle, hasWon/hasMissed, and payout()/creditDividend() that record the calls; add a deploy script for Anvil.
Plan first, wait for my OK. Done when: forge build is clean and the ABI is in handoffs/ within 2 hours.
```

**P2: BiddingModule**
```
Continue as PRANAV. Implement BiddingModule per README.md section 10.3: commit with keccak256(abi.encodePacked(bidAmount, salt, msg.sender)), no overwriting, member/hasWon/hasMissed checks; openReveal; revealBid with exact-match, floor (MIN_BID_BPS=5000) and pool-cap checks; settle with unrevealed-commit discard, lowest valid bid wins, ties to earliest commit, calls IPool.payout(winner, bid) and IPool.creditDividend(pool - bid); no-bids rollover; bidList visible only after reveal; events per IBidding with no commitment contents. Write the Foundry tests listed in section 10.6 against MockPool, including fuzz tests (payout never exceeds the pool, hidden bids stay hidden) and all vectors in handoffs/payout_vectors.json that apply. Done when: forge test is green and I can read a short summary of gas and coverage.
```

**P3: Bid screens**
```
Continue as PRANAV. Build features/bidding and route /circles/[id]/bidding per README.md section 10.4 with Next.js + wagmi/viem + Tailwind + shadcn/ui: commit screen (validated against floor and pool, generates a salt, calls commitBid, saves {bid, salt} locally), waiting screen showing only "x of y committed", reveal screen with a prominent warning that unrevealed bids are discarded, results screen with the full bid list, winner, reason, and dividend carried, and an "already won" state. Use a local test wallet on Anvil with MockPool until Pruthvik's wallet is ready. Amounts are base-unit bigints formatted with 6 decimals. Never display anyone's bid before reveal. Done when: the whole commit -> reveal -> results flow works locally.
```

**P4: 1-Click Reveal + deploy**
```
Continue as PRANAV. Add the demo-mode 1-Click Reveal per README.md section 10.5: when DEMO_MODE=true, derive the salt as keccak256 of the wallet's signature over "ChitChain bid | circleId | cycle | memberAddress", save the bid locally, and let one button re-derive the salt and call revealBid. Add a test that wipes local storage and still reveals. Then write the deploy script (BiddingModule per circle constructed with the vault address, then the volunteer calls PoolVault.setBiddingModule) for Anvil and Base Sepolia, verify on Basescan, and write addresses to deployments/base-sepolia.json. Done when: wiping local storage never blocks a reveal in demo mode and the contracts are verified.
```

**P5: Integration**
```
Continue as PRANAV. Replace MockPool with Nivish's real PoolVault and his scheduler calling openReveal() and settle(); use Pruthvik's real wallet and signer for the screens. Fix event/field mismatches from Sync 1. Run two full cycles on Base Sepolia: commit -> reveal -> settle, check that the winner receives the winning bid, the dividend appears in the next cycle's poolAmount(), and a previous winner cannot win again. Done when: both cycles pass on Base Sepolia in demo mode.
```

---

## 11. Integration

### 11.1 Timeline

| Phase | What happens |
|---|---|
| **Phase 0** (about 45 min) | Freeze `UserProfile`, `FinalizedCircle`, `IPool`, `IBidding`, `autopay-policy.json`. Agree payout rule + DEFAULTs. Ujwal creates the shell. Pruthvik starts the 2-hour spike. Stubs on Anvil within 2 hours |
| **Phase 1** | Everyone builds their slice against mocks |
| **Sync 1** (30 min) | Merge to `dev`. Align field names and event args |
| **Phase 2** | Replace mocks in this order: user API -> finalized circle -> autopay mandate -> pool -> bidding |
| **Sync 2** | One full run on Base Sepolia |
| **Phase 3** | Fixes, demo script, wallet demo video |

### 11.2 Sync 2 full run (acceptance)

1. Five users create wallets and accounts (Pruthvik), add money.
2. Ujwal's volunteer creates a 5-person circle, 3 or 4 months; try an invalid duration and an under-funded invitee to show the gates.
3. Invites accepted; issues raised and resolved; everyone presses No issues -> `Finalized`.
4. Volunteer creates the vault; all five give autopay; `start()`.
5. Month 1: collect (scheduler), members commit secret bids, HOLD, reveal, HOLD, settle: winner paid, dividend carried.
6. Month 2: pool includes the dividend; bid again; previous winner is blocked from winning.
7. Check final balances on Basescan.

### 11.3 Demo script (about 5 minutes)
Same as 11.2 using demo mode and the HOLD/Continue panel. Open with Pruthvik's wallet video.

---

## 12. Open questions (decide in Phase 0)

| # | Question |
|---|---|
| 1 | Payout rule A or B (Nivish + Pranav) |
| 2 | Confirm or replace DEFAULTs D1 to D12 (section 5) |
| 3 | Bid date: last day of the month (this plan) vs the 2nd |
| 4 | Autopay stack unverified on Base Sepolia: Pruthvik's spike decides; fallback is a pre-funded smart account |
| 5 | Does the mandate also allow `vault.recordContribution()`? (strongly suggested, section 4.5) |
| 6 | Who owns pooling vs bidding: assumed Nivish and Pranav |
| 7 | The PDF has no reserve or yield. Without a reserve there is no protection against a winner who stops paying; accepted for the prototype |

Gap that stays on the roadmap, not in the prototype: DeFi yield, locked reserves, KYC, notifications beyond in-app, audit, mainnet.
