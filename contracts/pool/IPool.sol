// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPool
 * @notice Interface for ChitChain pool vault on Base Sepolia.
 * @dev Payout rule (A or B) PENDING agreement with Pranav:
 *      Rule A: volunteer receives the Round 1 pot with no discount (commission-free), bidding starts in Round 2.
 *      Rule B: circle dissolves early after N-1 / N-2 rounds and the remaining balance is split among members.
 */
interface IPool {
    enum Phase {
        NotStarted,
        Collect,
        Bidding,
        Settle,
        Completed
    }

    // views used by the bidding module and UIs
    function currentCycle() external view returns (uint256); // 1-based
    function phase() external view returns (Phase);
    function poolAmount() external view returns (uint256); // contributions this cycle + dividend carried in
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
    event CircleMaturitySettled(uint256 totalPayout, uint256 perMemberShare);
}
