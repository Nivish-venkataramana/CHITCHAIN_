// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../pool/IPool.sol";

/**
 * @title MockPool
 * @notice Mock implementation of IPool for testing BiddingModule and Pranav's slice.
 */
contract MockPool is IPool {
    uint256 public override currentCycle = 1;
    Phase public override phase = Phase.Bidding;
    uint256 public override poolAmount = 5000000000; // 5,000 USDC default (6 decimals)
    address[] internal _members;
    
    mapping(address => bool) internal _hasWon;
    mapping(address => bool) internal _hasMissed;

    // Call recording for assertions
    struct PayoutRecord {
        uint256 cycle;
        address winner;
        uint256 amount;
    }
    struct DividendRecord {
        uint256 cycle;
        uint256 totalDividend;
    }

    PayoutRecord[] public payoutRecords;
    DividendRecord[] public dividendRecords;

    constructor(address[] memory members_) {
        _members = members_;
    }

    function members() external view override returns (address[] memory) {
        return _members;
    }

    function hasWon(address member) external view override returns (bool) {
        return _hasWon[member];
    }

    function hasMissed(address member) external view override returns (bool) {
        return _hasMissed[member];
    }

    function payout(address winner, uint256 amount) external override {
        require(amount <= poolAmount, "Payout exceeds pool");
        _hasWon[winner] = true;
        payoutRecords.push(PayoutRecord({
            cycle: currentCycle,
            winner: winner,
            amount: amount
        }));
        emit PayoutSent(currentCycle, winner, amount);
    }

    function creditDividend(uint256 totalDividend) external override {
        dividendRecords.push(DividendRecord({
            cycle: currentCycle,
            totalDividend: totalDividend
        }));
        emit DividendCredited(currentCycle, totalDividend);
    }

    // --- Mock Control Setters ---
    function setPhase(Phase newPhase) external {
        phase = newPhase;
        emit PhaseChanged(currentCycle, newPhase);
    }

    function setCurrentCycle(uint256 cycle) external {
        currentCycle = cycle;
    }

    function setPoolAmount(uint256 amount) external {
        poolAmount = amount;
    }

    function setMembers(address[] calldata newMembers) external {
        _members = newMembers;
    }

    function setHasWon(address member, bool won) external {
        _hasWon[member] = won;
    }

    function setHasMissed(address member, bool missed) external {
        _hasMissed[member] = missed;
        if (missed) {
            emit MemberMissed(currentCycle, member);
        }
    }

    function getPayoutRecordsCount() external view returns (uint256) {
        return payoutRecords.length;
    }

    function getDividendRecordsCount() external view returns (uint256) {
        return dividendRecords.length;
    }
}
