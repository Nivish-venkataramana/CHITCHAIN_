// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PoolVault} from "./PoolVault.sol";

/**
 * @title CircleFactory
 * @notice Factory contract that deploys minimal-proxy clones of PoolVault for ChitChain circles.
 */
contract CircleFactory is Ownable {
    using Clones for address;

    address public immutable vaultImplementation;
    address[] public allVaults;

    // Configurable defaults (owner-settable for demo / production)
    uint256 public defaultCollectWindow = 1 days;
    uint256 public defaultBiddingWindow = 1 days;
    uint8 public defaultPayoutRule = 0; // 0: Rule A, 1: Rule B

    event CircleCreated(
        address indexed vault,
        address indexed volunteer,
        address[] members,
        uint256 monthlyAmount,
        uint256 durationMonths
    );

    event ConfigDefaultsUpdated(
        uint256 collectWindow,
        uint256 biddingWindow,
        uint8 payoutRule
    );

    error ImplementationZeroAddress();
    error CircleDeploymentFailed();

    constructor(address _vaultImplementation) Ownable(msg.sender) {
        if (_vaultImplementation == address(0)) revert ImplementationZeroAddress();
        vaultImplementation = _vaultImplementation;
    }

    /**
     * @notice Deploys a new minimal proxy PoolVault clone and initializes it.
     * @param members Array of member wallet addresses (including volunteer).
     * @param monthlyAmount Fixed contribution per cycle in base units (6 decimals).
     * @param durationMonths Total tenure in cycles (must be N-1 or N-2).
     * @param token ERC20 token address (MockUSDC).
     */
    function createCircle(
        address[] calldata members,
        uint256 monthlyAmount,
        uint256 durationMonths,
        address token
    ) external returns (address vault) {
        vault = vaultImplementation.clone();
        if (vault == address(0)) revert CircleDeploymentFailed();

        PoolVault(vault).initialize(
            members,
            monthlyAmount,
            durationMonths,
            token,
            msg.sender, // caller is volunteer
            defaultCollectWindow,
            defaultBiddingWindow,
            defaultPayoutRule
        );

        allVaults.push(vault);

        emit CircleCreated(
            vault,
            msg.sender,
            members,
            monthlyAmount,
            durationMonths
        );
    }

    /**
     * @notice Update default windows and payout rule for upcoming circles.
     */
    function setDefaults(
        uint256 _collectWindow,
        uint256 _biddingWindow,
        uint8 _payoutRule
    ) external onlyOwner {
        defaultCollectWindow = _collectWindow;
        defaultBiddingWindow = _biddingWindow;
        defaultPayoutRule = _payoutRule;
        emit ConfigDefaultsUpdated(_collectWindow, _biddingWindow, _payoutRule);
    }

    /**
     * @notice Returns total number of vaults deployed.
     */
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /**
     * @notice Returns list of all deployed vault addresses.
     */
    function getVaults() external view returns (address[] memory) {
        return allVaults;
    }
}
