# ChitChain

**Transparent pooling. Private bidding. Programmable payouts.**

ChitChain is a decentralized chit fund prototype that enables trusted community members to form savings circles, contribute stablecoins, participate in private auctions, and distribute payouts through smart contracts.

## Overview

Chit funds are community-based savings arrangements in which members contribute a fixed amount periodically and one participant receives the pooled amount during each cycle.

Traditional arrangements can depend on a central organizer, manual accounting, and participants fulfilling their financial commitments. ChitChain explores how blockchain technology and smart contracts can make these processes more transparent, verifiable, and rule-driven.

The platform is designed around trusted groups, predefined contribution rules, scoped recurring-payment permissions, and commit-reveal auctions. Its smart contracts are intended to enforce the financial rules within their implemented scope.

The project is being developed as a prototype on **Base Sepolia**, with **Anvil** used for local blockchain development.

> **Project status:** Experimental prototype. Feature descriptions represent the intended design and must be verified against the current implementation.

## Problem Statement

Community savings systems face several challenges:

- **Dependence on organizers:** Participants may have limited visibility into how pooled funds are handled.
- **Limited transparency:** Manual records make it harder to independently verify contributions and payouts.
- **Auction privacy:** Publicly visible bids can influence other participants' decisions.
- **Missed contributions:** Defaults can disrupt the operation of an entire circle.
- **Operational overhead:** Collecting contributions, tracking balances, and settling payouts require coordination.

ChitChain aims to address these challenges through programmable financial rules, verifiable on-chain transactions, and private bidding during the commitment phase.

## Key Features

- **Community savings circles** — Create or join a group with predefined membership, contribution amounts, and duration.
- **Wallet-based accounts** — Associate a unique username with a participant's smart account.
- **Member invitations** — Invite participants and check eligibility requirements before finalizing a circle.
- **Collective configuration review** — Allow members to raise issues, review resolutions, and confirm the circle configuration.
- **Scoped recurring-payment permissions** — Design contribution permissions around a designated circle vault.
- **Automated pooling** — Track contributions and pool balances across collection cycles.
- **Commit-reveal auctions** — Commit to bids privately, then reveal them during the designated phase.
- **Deterministic winner selection** — Select the lowest valid revealed bid, with earlier commitments resolving ties according to the intended rules.
- **Payout and dividend accounting** — Track settlement amounts and carry forward the remaining balance according to contract rules.
- **Local and testnet development** — Develop and test using Anvil before demonstrating on Base Sepolia.

## How It Works

1. **Create an account:** A participant connects or creates a wallet and registers a unique username.
2. **Create a circle:** A volunteer configures the group name, participant count, monthly contribution, and duration.
3. **Invite participants:** Members are invited to join the circle and satisfy its configured eligibility requirements.
4. **Review the configuration:** Participants raise issues, the volunteer resolves them, and members confirm that no issues remain.
5. **Authorize contributions:** Members grant the required recurring-payment permissions, where implemented.
6. **Collect contributions:** The collection process transfers or accounts for contributions in the circle vault.
7. **Commit bids:** Eligible participants submit cryptographic commitments to their bids without immediately disclosing the amounts.
8. **Reveal bids:** Participants reveal their original bids during the reveal phase.
9. **Settle the auction:** The contract applies the configured eligibility and winner-selection rules.
10. **Record the payout:** The winner receives the authorized payout, and any remaining balance is accounted for according to the settlement logic.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling and components | Tailwind CSS, shadcn/ui |
| Wallet authentication | Privy |
| Smart accounts and gas sponsorship | Biconomy SDK |
| Blockchain interaction | wagmi, viem |
| Smart contracts | Solidity, Foundry |
| Contract libraries | OpenZeppelin |
| Database | PostgreSQL, Prisma |
| Input validation | Zod |
| Scoped recurring permissions | Rhinestone Smart Sessions |
| Test network | Base Sepolia |
| Local blockchain | Anvil |
| Test token | MockUSDC with 6 decimals |

The technologies listed above describe the project's architecture. Refer to the source code and environment configuration to determine which integrations are currently operational.

## System Architecture

```text
                         ChitChain
                             |
                  +----------+----------+
                  |                     |
              Next.js UI             API Layer
                  |                     |
          +-------+--------+       PostgreSQL
          |       |        |          |
        Wallet  Circle   Pool &      Prisma
        Access  Setup   Auction UI
          |       |        |
          +-------+--------+
                  |
             wagmi + viem
                  |
              Base Sepolia
                  |
          +-------+---------+
          |                 |
     CircleFactory     BiddingModule
          |                 |
       PoolVault <-----------+
          |
       MockUSDC
```

### Architectural components

- **Frontend:** Provides account, circle, contribution, and auction interfaces.
- **API layer:** Handles application operations and persistent data where configured.
- **Database:** Stores application records through PostgreSQL and Prisma.
- **CircleFactory:** Intended to create or register circle vaults.
- **PoolVault:** Intended to account for contributions, collection cycles, and authorized payouts.
- **BiddingModule:** Intended to handle bid commitments, reveals, winner selection, and settlement accounting.
- **MockUSDC:** A development token used to simulate stablecoin contributions on test environments.

On-chain enforcement depends on the actual deployed contract code. The diagram is a conceptual overview, not a guarantee that every component has been deployed or integrated.

## Getting Started

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/) — use a version supported by the project's dependencies.
- [Git](https://git-scm.com/)
- [Foundry](https://getfoundry.sh/) — for Solidity development and local blockchain testing.
- PostgreSQL — if database-backed features are enabled.
- A Base Sepolia RPC endpoint — for testnet interaction.
- npm or pnpm — use the package manager matching the repository lockfile.

### 1. Clone the repository

Replace the placeholder with your actual GitHub repository URL.

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

### 2. Install dependencies

For an npm-based repository:

```bash
npm install
```

If the project uses pnpm, run `pnpm install` instead.

### 3. Configure environment variables

Create a local `.env` file based on the variables required by the project. The following is a reference template; retain only variables that the current implementation actually uses.

```dotenv
# Blockchain
BASE_SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
SCHEDULER_PRIVATE_KEY=
BASESCAN_API_KEY=

# Database
DATABASE_URL=

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Smart accounts and transaction infrastructure
BUNDLER_URL=
PAYMASTER_URL=

# Deployed contract addresses
NEXT_PUBLIC_MOCK_USDC_ADDRESS=
NEXT_PUBLIC_FACTORY_ADDRESS=

# Development settings
DEV_LOGIN=true
DEMO_MODE=true
```

**Important:** Never commit `.env` files, private keys, API secrets, or production credentials. Add `.env` to `.gitignore` and provide safe example values in `.env.example`.

### 4. Set up the database

If the application uses Prisma migrations and a configured PostgreSQL database, run:

```bash
npx prisma generate
npx prisma migrate dev
```

If the repository does not yet include a Prisma schema or migrations, complete that setup before running these commands.

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The command assumes that the repository defines a `dev` script in `package.json`.

### 6. Build and test the smart contracts

From the directory containing `foundry.toml`, run:

```bash
forge install
forge build
forge test
```

Start a local development blockchain in a separate terminal:

```bash
anvil
```

Deploy contracts using the deployment scripts provided by the repository. Configure the RPC endpoint, deployer account, and other required settings before deploying to Base Sepolia.

> **Setup note:** Verify the commands and paths against the actual repository before publishing this README. Do not assume that deployment scripts, migrations, or package scripts exist unless they are present in the codebase.

## Usage

### Creating a circle

1. Log in and open the application.
2. Select **Create a Circle**.
3. Enter the circle name, participant count, monthly contribution, and duration.
4. Invite participants using the supported account-identification method.
5. Review invitations and resolve configuration issues.
6. Finalize the circle after the required confirmations.

The intended duration rule requires the term to be either \(N-1\) or \(N-2\) months, where \(N\) is the total participant count. Confirm this constraint in the implementation before relying on it.

### Contributing to the pool

1. Open the finalized circle.
2. Authorize the configured contribution permissions, if supported.
3. Ensure the required members have completed authorization.
4. Start or execute the collection cycle using the available application workflow.
5. Verify contribution statuses and the recorded pool balance.

### Participating in an auction

1. Open the active auction.
2. Submit a bid commitment during the commitment phase.
3. Keep the original bid and its salt available for the reveal phase.
4. Reveal the bid before the reveal deadline.
5. Review the settled result and recorded payout.

The intended rules prevent a previous winner from winning again and make members with missed contributions ineligible to bid. These restrictions must be enforced by the deployed contracts before they can be considered reliable.

## Smart Contracts

The intended contract responsibilities are:

| Contract | Responsibility |
|---|---|
| `MockUSDC` | Provides test tokens for development and demonstration. |
| `CircleFactory` | Creates or registers circle vaults. |
| `PoolVault` | Manages contribution accounting, collection cycles, and payouts. |
| `BiddingModule` | Handles commit-reveal auctions and settlement rules. |

### Commit-reveal auction model

A commit-reveal auction separates bidding into two phases:

**Commit phase**
- A participant chooses a bid amount and a secret salt.
- The participant submits a cryptographic commitment derived from the bid and salt.
- The commitment is recorded without directly disclosing the bid amount.

**Reveal phase**
- The participant reveals the bid amount and corresponding salt.
- The contract verifies the reveal against the earlier commitment.
- Valid bids are evaluated using the configured eligibility and winner-selection rules.

Participants must preserve their bid and salt until they reveal. Losing the salt or missing the reveal deadline may prevent a commitment from becoming a valid bid.

## Development and Testing

The project is organized around parallel workstreams:

| Workstream | Responsibility |
|---|---|
| Account | Wallet creation, account identity, user APIs, and recurring-payment permissions |
| Circle setup | Circle creation, invitations, issue resolution, and finalization |
| Pool | Test token, factory, vault, and collection scheduler |
| Bidding | Commit-reveal auctions, winner selection, and settlement |

### Recommended development sequence

1. Install dependencies and configure local environment variables.
2. Build and test the contracts locally.
3. Deploy the contracts to Anvil.
4. Connect the frontend to the local deployment.
5. Verify account and circle workflows.
6. Test contributions, auction commitment, reveal, and settlement.
7. Verify integration behavior on Base Sepolia.
8. Document known limitations before demonstrating the application.

Run the project's actual test and lint scripts as defined in `package.json` and the Foundry configuration.

## Roadmap

- [ ] Complete wallet and account creation.
- [ ] Complete circle creation and membership workflows.
- [ ] Implement and verify circle configuration confirmations.
- [ ] Complete contribution accounting and vault lifecycle.
- [ ] Implement and test commit-reveal auctions.
- [ ] Verify winner eligibility and tie-breaking rules.
- [ ] Complete payout and dividend accounting.
- [ ] Integrate scoped recurring-payment permissions.
- [ ] Complete end-to-end Base Sepolia integration.
- [ ] Improve error handling, monitoring, and developer documentation.
- [ ] Conduct an independent smart contract security audit before any production use.

## Contributing

Contributions are welcome as the project develops.

1. Fork the repository or create a feature branch.
2. Keep each change focused on one feature or fix.
3. Follow the existing project structure and contract interfaces.
4. Add or update tests for changed behavior.
5. Run the relevant checks locally.
6. Open a pull request against the repository's designated development branch with a clear description of the changes and verification performed.

For team-specific implementation instructions, see the [Team Build Guide](docs/TEAM_BUILD_GUIDE.md), if included in the repository.

## Documentation

- [Team Build Guide](docs/TEAM_BUILD_GUIDE.md) — implementation stages, team responsibilities, and integration workflow.
- [Product Requirements](docs/PRD.md) — product behavior and acceptance criteria.
- [Team Workflow Reference](docs/TEAM_SPLIT_PDF_FLOW.md) — task ownership and workflow reference.

Update these links to match the actual files included in the repository.

## Security Disclaimer

ChitChain is an experimental project intended for development, testing, and demonstration on blockchain test networks.

- It has **not been independently audited**.
- It must **not be used to manage real funds**.
- MockUSDC is a test token and is not real USDC.
- Testnet deployment does not establish production readiness.
- Smart contracts and recurring-payment permissions can introduce financial and security risks.

Do not deposit real assets or grant permissions to contracts unless they have been independently reviewed and explicitly prepared for that purpose.

## License

No license has been specified yet. Add a `LICENSE` file and update this section before publishing the project under a particular open-source license.

## Team

Developed by **Team ChitChain**.

- **Pruthvik** — Wallet and account workflows · [GitHub](https://github.com/1pruthvik)
- **Ujwal** — Circle setup and application shell
- **Nivish Venkataramana** — Pooling contracts and scheduler · [GitHub](https://github.com/Nivish-venkataramana)
- **Pranav** — Bidding contracts and auction workflow

---

<p align="center">
  <strong>ChitChain</strong><br />
  Decentralizing community finance through programmable trust.
</p>
