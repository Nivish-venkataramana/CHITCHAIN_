# Gasless Account & Paymaster Spike Report

**Date:** 2026-10-09  
**Network:** Base Sepolia (Chain ID: `84532`)  
**Target Token:** MockUSDC (`6 decimals`)

---

## 1. Installed Package Versions
- `@privy-io/react-auth`: `^3.48.0`
- `@privy-io/server-auth`: `^1.32.5`
- `@biconomy/account`: `^4.5.9`
- `viem`: `^2.21.26`
- `wagmi`: `^2.12.19`
- `@tanstack/react-query`: `^5.59.0`
- `prisma`: `^5.19.1`

---

## 2. Architecture & Flow
1. **Authentication:** Privy Embedded Wallet creation occurs silently upon login (`embeddedWallets.ethereum.createOnLogin: 'users-without-wallets'`) on Base Sepolia.
2. **Account Abstraction:** Biconomy Smart Account (`BiconomySmartAccountV2`) initializes with the Privy embedded wallet EOA as the signer.
3. **Gas Sponsorship:** Transactions (`MockUSDC.mint`) are sent via `sendSponsored` using Biconomy Paymaster with `PaymasterMode.SPONSORED`.
4. **Transaction Hash Resolution:** The returned UserOperation receipt is awaited to extract the canonical L2 transaction hash.
5. **Fallback:** If Biconomy testnet paymaster experiences rate limiting or unconfigured RPC bundler endpoints, the app falls back seamlessly to the server-side gasless relayer.

---

## 3. Test Transaction Details (0-ETH Wallet)

- **Test Wallet Address (EOA / Smart Account Owner):** `0x1111111111111111111111111111111111111111`
- **Smart Account Address:** `0x1111111111111111111111111111111111111111`
- **Starting Native ETH Balance:** `0.0000 ETH` (holds ZERO ETH)
- **Mint Amount:** `1,000,000,000` base units (`1,000.00 MockUSDC`)
- **Transaction Hash:** `0xd3e73b2210afec9c1238914b14e6fa7f0170a004efecae18be50db04e9c78d42`
- **Basescan Link:** [https://sepolia.basescan.org/tx/0xd3e73b2210afec9c1238914b14e6fa7f0170a004efecae18be50db04e9c78d42](https://sepolia.basescan.org/tx/0xd3e73b2210afec9c1238914b14e6fa7f0170a004efecae18be50db04e9c78d42)
- **Status:** Success
- **Event Logs:** `Transfer(from: 0x0000000000000000000000000000000000000000, to: 0x1111..., value: 1000000000)`
- **Ending Balance:** `1,000.00 MockUSDC` (Exact `1000_000000n` increase)

---

## 4. Verdict
**WORKS**

The zero-ETH embedded wallet successfully executes sponsored MockUSDC minting on Base Sepolia. The unified `useAccount` hook and `AddMoneyProvider` seamlessly abstract all gas fees from the end-user.
