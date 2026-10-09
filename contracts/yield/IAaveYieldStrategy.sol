// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAaveYieldStrategy
 * @notice Standard interface for ChitChain circle Aave yield strategies.
 */
interface IAaveYieldStrategy {
    function vault() external view returns (address);
    function underlyingToken() external view returns (address);
    function aavePool() external view returns (address);
    function aToken() external view returns (address);

    function positionValue() external view returns (uint256);
    function cumulativeSupplies() external view returns (uint256);
    function cumulativeWithdrawals() external view returns (uint256);
    function suppliesPaused() external view returns (bool);

    function supply(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);
    function withdrawAll() external returns (uint256);

    function pauseSupply() external;
    function resumeSupply() external;

    event Supplied(address indexed vault, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed vault, uint256 amount, uint256 timestamp);
    event SupplyPaused(address indexed account);
    event SupplyResumed(address indexed account);
}
