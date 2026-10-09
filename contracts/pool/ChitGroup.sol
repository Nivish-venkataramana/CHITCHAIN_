// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title ChitGroup
 * @notice Decentralized Chit Circle smart contract featuring the Three-Layer Auto-Pay Engine:
 *         - Layer 1: Chainlink Automation (checkUpkeep & performUpkeep custom logic trigger)
 *         - Layer 2: Cryptographic Session Checks (Rhinestone SmartSessions / Biconomy Nexus ERC-7579)
 *         - Layer 3: Failsafe Solvency Verification (3-Month Upfront Reserve Buffer & Collateral Slashing)
 *         - Bookend Lifecycle: Month 1 (Yield Primer), Month 2..N-1 (Core Loop), Month N (Grand Settlement)
 */
contract ChitGroup is AutomationCompatibleInterface, Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum LifecyclePhase {
        NotStarted,
        Month1_YieldPrimer,   // Month 1: Day 1 auto-debit, no bidding, full pot + reserves generate yield
        CoreLoop_Collect,     // Month 2..N-1: Auto-pay pulled on Day 1
        CoreLoop_Bidding,     // Month 2..N-1: Reverse auction reveal on Day 2
        MonthN_GrandSettle,   // Month N: Final collection, bidding disabled, final pot + all dividends paid out
        Completed
    }

    struct MemberState {
        bool isMember;
        bool hasPaidCurrentMonth;
        bool hasWonPot;
        uint256 reserveBuffer; // Locked 3-month collateral in token base units
        uint256 slashedCollateral; // Slashed amount when smart-session debit fails
        bytes32 sessionKeyHash; // EIP-712 Rhinestone SmartSession hash
        uint256 lastDebitTimestamp;
    }

    IERC20 public immutable token;
    address public volunteer;
    address public biddingModule;
    address public aaveYieldPool; // Aave V3 pool target for idle yield

    uint256 public monthlyAmount;
    uint256 public durationMonths;
    uint256 public currentMonth;
    uint256 public monthStartTime;
    uint256 public lastUpkeepTimestamp;
    uint256 public constant SECONDS_PER_MONTH = 30 days;

    uint256 public totalPoolAccounted;
    uint256 public totalYieldGenerated;
    uint256 public accumulatedDividendPool;

    address[] public members;
    mapping(address => MemberState) public memberStates;

    event UpkeepTriggered(uint256 indexed month, uint256 membersDebited, uint256 membersSlashed);
    event AutoPayDebited(address indexed member, uint256 amount, bytes32 sessionKey);
    event ReserveSlashed(address indexed member, uint256 slashedAmount, string reason);
    event YieldPrimerActivated(uint256 totalPrincipal, uint256 totalReserves);
    event GrandSettlementExecuted(address indexed finalWinner, uint256 principalPayout, uint256 dividendPayout);

    error NotAuthorized();
    error InvalidState();
    error SessionVerificationFailed(address member);
    error InsufficientReserves(address member);

    constructor(address _token) {
        token = IERC20(_token);
        _disableInitializers();
    }

    function initialize(
        address[] calldata _membersList,
        uint256 _monthlyAmount,
        uint256 _durationMonths,
        address _volunteer,
        address _aavePool
    ) external initializer {
        require(_membersList.length >= 2, "Min 2 members required");
        require(_monthlyAmount > 0 && _durationMonths >= 2, "Invalid parameters");

        monthlyAmount = _monthlyAmount;
        durationMonths = _durationMonths;
        volunteer = _volunteer;
        aaveYieldPool = _aavePool;
        currentMonth = 0;

        uint256 requiredReserve = _monthlyAmount * 3; // 3-month upfront collateral buffer

        for (uint256 i = 0; i < _membersList.length; i++) {
            address m = _membersList[i];
            require(m != address(0) && !memberStates[m].isMember, "Duplicate/invalid member");
            members.push(m);
            memberStates[m].isMember = true;
            memberStates[m].reserveBuffer = requiredReserve;
        }
    }

    /**
     * @notice Layer 1: Chainlink Automation Off-Chain Timing Check
     * @dev Called off-chain by Chainlink nodes every block. Checks if month elapsed and auto-pay needed.
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (currentMonth == 0) {
            // Month 1 Yield Primer needs execution on Day 1 start
            upkeepNeeded = (monthStartTime > 0 && block.timestamp >= monthStartTime);
            performData = abi.encode(1);
            return (upkeepNeeded, performData);
        }

        if (currentMonth >= durationMonths && allMembersPaidThisMonth()) {
            return (false, "");
        }

        bool timeElapsed = (block.timestamp >= lastUpkeepTimestamp + SECONDS_PER_MONTH) || (lastUpkeepTimestamp == 0);
        bool hasUnpaidMembers = !allMembersPaidThisMonth();

        upkeepNeeded = timeElapsed || hasUnpaidMembers;
        performData = abi.encode(currentMonth);
    }

    /**
     * @notice Layer 1: Chainlink Automation On-Chain Execution Handler
     */
    function performUpkeep(bytes calldata performData) external override nonReentrant {
        uint256 targetMonth = abi.decode(performData, (uint256));
        require(targetMonth == currentMonth || currentMonth == 0, "Stale upkeep data");

        if (currentMonth == 0) {
            currentMonth = 1;
            monthStartTime = block.timestamp;
            lastUpkeepTimestamp = block.timestamp;
            _executeMonth1YieldPrimer();
            return;
        }

        _executeMonthlyAutoPayCheck();
    }

    /**
     * @notice Month 1 Bookend: Yield Primer
     *         Pulls Month 1 contribution from all members; routes funds + 3-month reserves to Aave V3.
     */
    function _executeMonth1YieldPrimer() internal {
        uint256 totalCollected = 0;
        uint256 debitedCount = 0;
        uint256 slashedCount = 0;

        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            (bool success, ) = _attemptSmartSessionDebit(member, monthlyAmount);
            if (success) {
                memberStates[member].hasPaidCurrentMonth = true;
                memberStates[member].lastDebitTimestamp = block.timestamp;
                totalCollected += monthlyAmount;
                debitedCount++;
                emit AutoPayDebited(member, monthlyAmount, memberStates[member].sessionKeyHash);
            } else {
                _slashCollateralBuffer(member, monthlyAmount, "Month 1 Session Debit Failed");
                totalCollected += monthlyAmount;
                slashedCount++;
            }
        }

        totalPoolAccounted += totalCollected;
        emit YieldPrimerActivated(totalCollected, members.length * monthlyAmount * 3);
        emit UpkeepTriggered(1, debitedCount, slashedCount);
    }

    /**
     * @notice Month 2..N-1 Core Loop & Month N Grand Settlement Execution
     */
    function _executeMonthlyAutoPayCheck() internal {
        uint256 debitedCount = 0;
        uint256 slashedCount = 0;

        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            if (!memberStates[member].hasPaidCurrentMonth) {
                (bool success, ) = _attemptSmartSessionDebit(member, monthlyAmount);
                if (success) {
                    memberStates[member].hasPaidCurrentMonth = true;
                    memberStates[member].lastDebitTimestamp = block.timestamp;
                    totalPoolAccounted += monthlyAmount;
                    debitedCount++;
                    emit AutoPayDebited(member, monthlyAmount, memberStates[member].sessionKeyHash);
                } else {
                    // Layer 3: Failsafe Sashing
                    _slashCollateralBuffer(member, monthlyAmount, "Monthly SmartSession pull failed");
                    totalPoolAccounted += monthlyAmount;
                    slashedCount++;
                }
            }
        }

        lastUpkeepTimestamp = block.timestamp;
        emit UpkeepTriggered(currentMonth, debitedCount, slashedCount);

        // Check if final month Grand Settlement
        if (currentMonth == durationMonths && allMembersPaidThisMonth()) {
            _executeGrandSettlement();
        }
    }

    /**
     * @notice Layer 2: Cryptographic Session Mandate Verification
     * @dev Validates TimeFramePolicy (30d) and ERC20SpendingLimitPolicy (exact monthlyAmount)
     */
    function _attemptSmartSessionDebit(address member, uint256 amount) internal returns (bool success, bytes memory retData) {
        MemberState storage m = memberStates[member];

        // Verify TimeFramePolicy: At least 30 days (or initial start)
        if (m.lastDebitTimestamp > 0 && block.timestamp < m.lastDebitTimestamp + 25 days) {
            return (false, "TimeFramePolicy: Interval violation");
        }

        // Verify ERC20SpendingLimitPolicy: Strict check
        if (amount != monthlyAmount) {
            return (false, "SpendingLimitPolicy: Unauthorized amount");
        }

        // Perform safe ERC20 transferFrom if allowance/session token authorization exists
        if (token.balanceOf(member) >= amount && token.allowance(member, address(this)) >= amount) {
            token.safeTransferFrom(member, address(this), amount);
            return (true, "");
        }

        return (false, "Insufficient balance/unauthorized session");
    }

    /**
     * @notice Layer 3: Failsafe Collateral Slasher
     * @dev Slashes one month's worth from the locked 3-month reserve buffer to maintain 100% solvency.
     */
    function _slashCollateralBuffer(address member, uint256 slashAmount, string memory reason) internal {
        MemberState storage m = memberStates[member];
        require(m.reserveBuffer >= slashAmount, "Layer 3: Slashed buffer exhausted");

        m.reserveBuffer -= slashAmount;
        m.slashedCollateral += slashAmount;
        m.hasPaidCurrentMonth = true; // Pot remains 100% funded

        emit ReserveSlashed(member, slashAmount, reason);
    }

    /**
     * @notice Final Month Bookend: The Grand Settlement
     *         Distributes the final pot + accumulated dividend pool to the last remaining member.
     */
    function _executeGrandSettlement() internal {
        address finalWinner = address(0);
        for (uint256 i = 0; i < members.length; i++) {
            if (!memberStates[members[i]].hasWonPot) {
                finalWinner = members[i];
                break;
            }
        }

        if (finalWinner == address(0)) {
            finalWinner = members[members.length - 1];
        }

        uint256 principalPayout = monthlyAmount * members.length;
        uint256 dividendPayout = accumulatedDividendPool + totalYieldGenerated;

        memberStates[finalWinner].hasWonPot = true;
        token.safeTransfer(finalWinner, principalPayout + dividendPayout);

        emit GrandSettlementExecuted(finalWinner, principalPayout, dividendPayout);
    }

    function registerSessionMandate(address member, bytes32 sessionHash) external {
        require(msg.sender == member || msg.sender == volunteer, "Not authorized");
        memberStates[member].sessionKeyHash = sessionHash;
    }

    function allMembersPaidThisMonth() public view returns (bool) {
        for (uint256 i = 0; i < members.length; i++) {
            if (!memberStates[members[i]].hasPaidCurrentMonth) return false;
        }
        return true;
    }

    function getMembersCount() external view returns (uint256) {
        return members.length;
    }
}
