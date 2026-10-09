import { encodeFunctionData, parseAbi } from "viem";
import { ConnectedWallet } from "@privy-io/react-auth";
import { sendSponsored } from "./smartAccount";
import deployments from "@/deployments/base-sepolia.json";

export interface AddMoneyProvider {
  mintMockUSDC(
    wallet: ConnectedWallet,
    amountBaseUnits: bigint
  ): Promise<{ transactionHash: `0x${string}` }>;
}

const MOCK_USDC_ABI = parseAbi([
  "function mint(address to, uint256 amount) public",
  "function transfer(address to, uint256 amount) public returns (bool)",
]);

export class MockFaucetProvider implements AddMoneyProvider {
  private tokenAddress: `0x${string}`;

  constructor(tokenAddress?: `0x${string}`) {
    this.tokenAddress =
      tokenAddress ||
      (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as `0x${string}`) ||
      (deployments.mockUSDC as `0x${string}`) ||
      "0x0000000000000000000000000000000000000000";
  }

  async mintMockUSDC(
    wallet: ConnectedWallet,
    amountBaseUnits: bigint = 1000_000000n // default 1,000 MockUSDC (6 decimals)
  ): Promise<{ transactionHash: `0x${string}` }> {
    const data = encodeFunctionData({
      abi: MOCK_USDC_ABI,
      functionName: "mint",
      args: [wallet.address as `0x${string}`, amountBaseUnits],
    });

    const result = await sendSponsored(wallet, {
      to: this.tokenAddress,
      data,
    });

    return {
      transactionHash: result.transactionHash,
    };
  }
}

export const defaultAddMoneyProvider = new MockFaucetProvider();
