// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IPool} from "./IPool.sol";

/**
 * @title PoolVault
 * @notice Central pooling vault smart contract for ChitChain circles.
 * @dev Implements IPool. Cloned via CircleFactory minimal proxies.
 *      Never pulls funds with transferFrom; verifies token balance growth upon recordContribution().
 */
contract PoolVault is IPool, Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Custom Errors
    error NotVolunteer();
    error BiddingModuleAlreadySet();
    error InvalidBiddingModule();
    error NotStartedStateRequired();
    error InvalidPhase(Phase expected, Phase actual);
    error NotMember();
    error AlreadyPaidThisCycle();
    error MemberHasMissed();
    error InsufficientTokenDeposit(uint256 expected, uint256 actual);
    error OnlyBiddingModule();
    error PayoutExceedsPool(uint256 requested, uint256 pool);
    error WinnerAlreadyWon();
    error WinnerHasMissed();
    error CircleAlreadyCompleted();
    error InvalidConfiguration();

    IERC20 public token;
    address public volunteer;
    address public biddingModule;
    bool public biddingModuleBound;

    uint256 public monthlyAmount;
    uint256 public durationMonths;
    address[] private _members;

    mapping(address => bool) public isMember;
    mapping(address => bool) public override hasWon;
    mapping(address => bool) public override hasMissed;

    uint256 public override currentCycle;
    Phase public override phase;

    uint256 public accountedBalance;
    uint256 public carriedDividend;
    uint256 public cycleContributions;

    mapping(uint256 => mapping(address => bool)) public hasPaidCycle;

    uint256 public collectStartTime;
    uint256 public collectWindow;
    uint256 public biddingWindow;
    uint8 public payoutRule; // 0: Rule A (volunteer round 1 full pot), 1: Rule B (early dissolution/standard)

    modifier onlyVolunteer() {
        if (msg.sender != volunteer) revert NotVolunteer();
        _;
    }

    modifier onlyBiddingModule() {
        if (msg.sender != biddingModule) revert OnlyBiddingModule();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes a clone instance of PoolVault.
     */
    function initialize(
        address[] calldata membersList,
        uint256 _monthlyAmount,
        uint256 _durationMonths,
        address _token,
        address _volunteer,
        uint256 _collectWindow,
        uint256 _biddingWindow,
        uint8 _payoutRule
    ) external initializer {
        if (membersList.length < 2 || _monthlyAmount == 0 || _durationMonths == 0 || _token == address(0) || _volunteer == address(0)) {
            revert InvalidConfiguration();
        }

        token = IERC20(_token);
        volunteer = _volunteer;
        monthlyAmount = _monthlyAmount;
        durationMonths = _durationMonths;
        collectWindow = _collectWindow;
        biddingWindow = _biddingWindow;
        payoutRule = _payoutRule;

        for (uint256 i = 0; i < membersList.length; i++) {
            address member = membersList[i];
            if (member == address(0) || isMember[member]) revert InvalidConfiguration();
            isMember[member] = true;
            _members.push(member);
        }

        phase = Phase.NotStarted;
        currentCycle = 0;
    }

    /**
     * @notice Allows volunteer to bind the BiddingModule once.
     */
    function setBiddingModule(address _biddingModule) external onlyVolunteer {
        if (biddingModuleBound) revert BiddingModuleAlreadySet();
        if (_biddingModule == address(0)) revert InvalidBiddingModule();
        biddingModule = _biddingModule;
        biddingModuleBound = true;
    }

    /**
     * @notice Volunteer starts cycle 1 once all autopay permissions are active.
     */
    function start() external onlyVolunteer {
        if (phase != Phase.NotStarted) revert InvalidPhase(Phase.NotStarted, phase);

        currentCycle = 1;
        phase = Phase.Collect;
        collectStartTime = block.timestamp;

        emit CircleStarted(block.timestamp);
        emit PhaseChanged(1, Phase.Collect);
    }

    /**
     * @notice Records a member contribution. Verifies vault token balance increased by monthlyAmount.
     */
    function recordContribution() external nonReentrant {
        if (phase != Phase.Collect) revert InvalidPhase(Phase.Collect, phase);
        if (!isMember[msg.sender]) revert NotMember();
        if (hasPaidCycle[currentCycle][msg.sender]) revert AlreadyPaidThisCycle();
        if (hasMissed[msg.sender]) revert MemberHasMissed();

        uint256 currentBalance = token.balanceOf(address(this));
        uint256 expectedMinimum = accountedBalance + monthlyAmount;
        if (currentBalance < expectedMinimum) {
            revert InsufficientTokenDeposit(expectedMinimum, currentBalance);
        }

        accountedBalance += monthlyAmount;
        cycleContributions += monthlyAmount;
        hasPaidCycle[currentCycle][msg.sender] = true;

        emit Contributed(currentCycle, msg.sender, monthlyAmount);
    }

    /**
     * @notice Closes collection window, marks non-payers as missed, advances phase to Bidding.
     */
    function collect() external {
        if (phase != Phase.Collect) revert InvalidPhase(Phase.Collect, phase);

        for (uint256 i = 0; i < _members.length; i++) {
            address member = _members[i];
            if (!hasPaidCycle[currentCycle][member] && !hasMissed[member]) {
                hasMissed[member] = true;
                emit MemberMissed(currentCycle, member);
            }
        }

        phase = Phase.Bidding;
        emit PhaseChanged(currentCycle, Phase.Bidding);
    }

    /**
     * @notice Total pool for current cycle = contributions collected + carried dividend.
     */
    function poolAmount() public view override returns (uint256) {
        return cycleContributions + carriedDividend;
    }

    /**
     * @notice Allows only the authorized bidding contract to pay the winner.
     */
    function payout(address winner, uint256 amount) external override onlyBiddingModule nonReentrant {
        if (phase != Phase.Bidding) revert InvalidPhase(Phase.Bidding, phase);
        if (!isMember[winner]) revert NotMember();
        if (hasWon[winner]) revert WinnerAlreadyWon();
        if (hasMissed[winner]) revert WinnerHasMissed();

        uint256 totalPool = poolAmount();
        if (amount > totalPool) revert PayoutExceedsPool(amount, totalPool);

        hasWon[winner] = true;
        if (amount > 0) {
            accountedBalance -= amount;
            token.safeTransfer(winner, amount);
        }

        emit PayoutSent(currentCycle, winner, amount);
    }

    /**
     * @notice Allows only the authorized bidding contract to credit leftover pool as dividend.
     */
    function creditDividend(uint256 totalDividend) external override onlyBiddingModule {
        if (phase != Phase.Bidding) revert InvalidPhase(Phase.Bidding, phase);
        carriedDividend = totalDividend;
        emit DividendCredited(currentCycle, totalDividend);
    }

    /**
     * @notice Advances the cycle or completes the circle after bidding settlement.
     */
    function settle() external {
        if (phase != Phase.Bidding && phase != Phase.Settle) {
            revert InvalidPhase(Phase.Bidding, phase);
        }

        emit CycleSettled(currentCycle);

        if (currentCycle >= durationMonths) {
            phase = Phase.Completed;
            emit PhaseChanged(currentCycle, Phase.Completed);
        } else {
            currentCycle++;
            cycleContributions = 0;
            collectStartTime = block.timestamp;
            phase = Phase.Collect;
            emit PhaseChanged(currentCycle, Phase.Collect);
        }
    }

    /**
     * @notice Settles circle maturity at the end of tenure, distributing remaining compounded dividends and principal pro-rata to truthful members.
     */
    function settleMaturity() external nonReentrant {
        if (phase != Phase.Completed) revert CircleAlreadyCompleted();

        uint256 totalVaultBalance = token.balanceOf(address(this));
        if (totalVaultBalance == 0) return;

        // Count truthful members (who did not miss payments)
        uint256 truthfulCount = 0;
        for (uint256 i = 0; i < _members.length; i++) {
            if (!hasMissed[_members[i]]) {
                truthfulCount++;
            }
        }

        if (truthfulCount == 0) return;

        uint256 perMemberPayout = totalVaultBalance / truthfulCount;
        if (perMemberPayout > 0) {
            for (uint256 i = 0; i < _members.length; i++) {
                address m = _members[i];
                if (!hasMissed[m]) {
                    token.safeTransfer(m, perMemberPayout);
                }
            }
        }

        accountedBalance = 0;
        carriedDividend = 0;
        emit CircleMaturitySettled(totalVaultBalance, perMemberPayout);
    }

    // View functions
    function members() external view override returns (address[] memory) {
        return _members;
    }
}
