# ChitChain Demo Video Storyboard (Pruthvik Slice)

**File Asset Target:** `public/demo/wallet-demo.mp4`

## Scene Breakdown

### Scene 1: Embedded Smart Account Creation & Login (0:00 - 0:45)
- User arrives at ChitChain (`/account/login`).
- Selects Privy authentication (Email / Phone / Connect Wallet).
- Gasless Biconomy smart account address is automatically generated on Base Sepolia (`chainId: 84532`).
- Shows the counterfactual public key displayed on `/account/wallet`.

### Scene 2: Gasless Test Faucet Minting (0:45 - 1:15)
- User navigates to `/account/wallet`.
- Clicks "Faucet: Add 1,000 MockUSDC".
- Transaction is sponsored by the Paymaster (zero testnet ETH required).
- MockUSDC balance increments to 1,000 USDC with 6 decimal accuracy.

### Scene 3: Account Creation & Unique Username Rule (1:15 - 2:00)
- User navigates to `/account/create`.
- Enters Real Full Name: "Asha Rao".
- Attempts invalid username: "ashok" -> Live helper rejects (Missing name).
- Attempts exact username: "asharao" -> Live helper rejects (Must contain suffix).
- Enters valid username: "asharao01" -> Live helper glows green.
- Submits form -> Account profile is permanently bound to the smart account address on-chain.

### Scene 4: Scoped Autopay SmartSession Mandate (2:00 - 3:00)
- User opens a finalized circle at `/circles/[id]/autopay`.
- Volunteer deploys circle vault clone.
- Member reviews strictly scoped permission:
  - Destination: Only this circle's vault address.
  - Function: `MockUSDC.transfer` (max monthly amount) + `recordContribution()`.
  - Max frequency: 1 per monthly cycle.
- Member signs EIP-712 session key message.
- Status board flips to `Given`.
- Once all members grant permissions, volunteer triggers `vault.start()` to launch Month 1 pooling!
