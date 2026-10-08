// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Test ERC-20 token representing USDC with 6 decimals for ChitChain.
 * @dev Includes public mint function for testing and demo account funding.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    /**
     * @notice Returns 6 decimals to match standard USDC.
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Public minting function to fund demo wallets and testing accounts.
     * @param to The recipient address.
     * @param amount The amount in base units (e.g. 1000 USDC = 1000000000).
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
