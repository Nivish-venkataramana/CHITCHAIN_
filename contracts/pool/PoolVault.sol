// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPool.sol";
import "./MockUSDC.sol";

/**
 * @title PoolVault
 * @notice Vault contract per circle holding pooled MockUSDC funds and running the monthly cycle clock.
 * @dev Deployed as minimal proxy clone by CircleFactory.
 */
contract PoolVault is IPool {
    address public factory;
    address public volunteer;
    address public token;
    address public biddingModule;

    uint256 public monthlyAmount;
    uint256 public durationMonths;
    uint256 public override currentCycle;
    Phase public override phase;

    address[] private _members;
    mapping(address => bool) private _isMember;
    mapping(address => bool) public override hasWon;
    mapping(address => bool) public override hasMissed;

    // Per-cycle accounting
    mapping(uint256 => mapping(address => bool)) public hasContributed;
    mapping(uint256 => uint256) public cyclePoolAmount;
    uint256 public accountedBalance;
    uint256 public carriedDividend;

    bool public initialized;

    modifier onlyVolunteer() {
        require(msg.sender == volunteer, "Only volunteer");
        _;
    }

    modifier onlyBiddingModule() {
        require(msg.sender == biddingModule, "Only bidding module");
        _;
    }

    modifier inPhase(Phase p) {
        require(phase == p, "Invalid phase");
        _;
    }

    function initialize(
        address[] calldata memberList,
        uint256 _monthlyAmount,
        uint256 _durationMonths,
        address _token,
        address _volunteer
    ) external {
        require(!initialized, "Already initialized");
        require(memberList.length >= 2, "Minimum 2 members");
        require(_monthlyAmount > 0, "Amount must be > 0");

        initialized = true;
        factory = msg.sender;
        volunteer = _volunteer;
        token = _token;
        monthlyAmount = _monthlyAmount;
        durationMonths = _durationMonths;

        for (uint256 i = 0; i < memberList.length; i++) {
            address m = memberList[i];
            require(m != address(0), "Zero address");
            _members.push(m);
            _isMember[m] = true;
        }

        phase = Phase.NotStarted;
        currentCycle = 1;
    }

    function setBiddingModule(address _biddingModule) external onlyVolunteer {
        require(biddingModule == address(0), "Bidding module already set");
        require(_biddingModule != address(0), "Zero address");
        biddingModule = _biddingModule;
    }

    function start() external onlyVolunteer inPhase(Phase.NotStarted) {
        phase = Phase.Collect;
        emit CircleStarted(block.timestamp);
        emit PhaseChanged(currentCycle, Phase.Collect);
    }

    function recordContribution() external inPhase(Phase.Collect) {
        require(_isMember[msg.sender], "Not a member");
        require(!hasMissed[msg.sender], "Member missed previous payment");
        require(!hasContributed[currentCycle][msg.sender], "Already contributed this cycle");

        uint256 actualBalance = MockUSDC(token).balanceOf(address(this));
        require(actualBalance >= accountedBalance + monthlyAmount, "Vault balance did not increase by monthly amount");

        accountedBalance += monthlyAmount;
        hasContributed[currentCycle][msg.sender] = true;

        emit Contributed(currentCycle, msg.sender, monthlyAmount);
    }

    function collect() external inPhase(Phase.Collect) {
        uint256 collectedThisCycle = 0;

        for (uint256 i = 0; i < _members.length; i++) {
            address m = _members[i];
            if (!hasContributed[currentCycle][m] && !hasMissed[m]) {
                hasMissed[m] = true;
                emit MemberMissed(currentCycle, m);
            } else if (hasContributed[currentCycle][m]) {
                collectedThisCycle += monthlyAmount;
            }
        }

        cyclePoolAmount[currentCycle] = collectedThisCycle + carriedDividend;
        carriedDividend = 0; // consumed into this month's pool

        phase = Phase.Bidding;
        emit PhaseChanged(currentCycle, Phase.Bidding);
    }

    function payout(address winner, uint256 amount) external override onlyBiddingModule inPhase(Phase.Bidding) {
        require(_isMember[winner], "Winner not a member");
        require(!hasWon[winner], "Winner already won");
        require(!hasMissed[winner], "Winner missed payment");
        require(amount <= poolAmount(), "Payout exceeds pool");

        hasWon[winner] = true;
        accountedBalance -= amount;

        bool success = MockUSDC(token).transfer(winner, amount);
        require(success, "Payout transfer failed");

        emit PayoutSent(currentCycle, winner, amount);
    }

    function creditDividend(uint256 totalDividend) external override onlyBiddingModule inPhase(Phase.Bidding) {
        carriedDividend += totalDividend;
        emit DividendCredited(currentCycle, totalDividend);
    }

    function settle() external inPhase(Phase.Bidding) {
        phase = Phase.Settle;
        emit CycleSettled(currentCycle);

        if (currentCycle >= durationMonths) {
            phase = Phase.Completed;
            emit PhaseChanged(currentCycle, Phase.Completed);
        } else {
            currentCycle += 1;
            phase = Phase.Collect;
            emit PhaseChanged(currentCycle, Phase.Collect);
        }
    }

    // View Functions
    function poolAmount() public view override returns (uint256) {
        return cyclePoolAmount[currentCycle];
    }

    function members() external view override returns (address[] memory) {
        return _members;
    }
}
