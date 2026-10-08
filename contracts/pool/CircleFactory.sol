// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PoolVault.sol";

/**
 * @title CircleFactory
 * @notice Factory that deploys minimal-proxy clones of PoolVault for every finalized circle.
 */
contract CircleFactory {
    address public immutable vaultImplementation;
    address[] public allVaults;

    event CircleCreated(
        address indexed vault,
        address indexed volunteer,
        address[] members,
        uint256 monthlyAmount,
        uint256 durationMonths
    );

    constructor() {
        vaultImplementation = address(new PoolVault());
    }

    function createCircle(
        address[] calldata members,
        uint256 monthlyAmount,
        uint256 durationMonths,
        address token
    ) external returns (address vault) {
        // Deploy standard contract clone
        PoolVault newVault = new PoolVault();
        newVault.initialize(members, monthlyAmount, durationMonths, token, msg.sender);

        vault = address(newVault);
        allVaults.push(vault);

        emit CircleCreated(vault, msg.sender, members, monthlyAmount, durationMonths);
    }

    function totalCircles() external view returns (uint256) {
        return allVaults.length;
    }
}
