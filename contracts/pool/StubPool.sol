// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPool} from "./IPool.sol";

/**
 * @title StubPool
 * @notice Mock implementation of IPool for fast compilation and early integration tests on Anvil.
 */
contract StubPool is IPool {
    Phase public override phase = Phase.NotStarted;
    uint256 public override currentCycle = 1;
    uint256 public mockPoolAmount = 5000 * 1e6;

    address[] private _members;
    mapping(address => bool) public override hasWon;
    mapping(address => bool) public override hasMissed;

    address public lastWinner;
    uint256 public lastPayoutAmount;
    uint256 public lastCreditedDividend;

    constructor(address[] memory initialMembers) {
        _members = initialMembers;
    }

    function setPhase(Phase _phase) external {
        phase = _phase;
        emit PhaseChanged(currentCycle, _phase);
    }

    function setCurrentCycle(uint256 _cycle) external {
        currentCycle = _cycle;
    }

    function setPoolAmount(uint256 _amount) external {
        mockPoolAmount = _amount;
    }

    function poolAmount() external view override returns (uint256) {
        return mockPoolAmount;
    }

    function members() external view override returns (address[] memory) {
        return _members;
    }

    function payout(address winner, uint256 amount) external override {
        lastWinner = winner;
        lastPayoutAmount = amount;
        hasWon[winner] = true;
        emit PayoutSent(currentCycle, winner, amount);
    }

    function creditDividend(uint256 totalDividend) external override {
        lastCreditedDividend = totalDividend;
        emit DividendCredited(currentCycle, totalDividend);
    }
}
