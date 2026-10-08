// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IBidding.sol";
import "../pool/IPool.sol";

/**
 * @title BiddingModule
 * @notice Secret commit-reveal bidding module for ChitChain circles.
 * @author Pranav
 */
contract BiddingModule is IBidding {
    IPool public immutable poolVault;

    BidPhase public override bidPhase = BidPhase.Commit;
    uint256 public constant MIN_BID_BPS = 5000; // 50% floor of poolAmount
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Per-cycle bid records
    mapping(uint256 => mapping(address => bytes32)) private _commitments;
    mapping(uint256 => mapping(address => uint64)) private _commitTimestamps;
    mapping(uint256 => mapping(address => bool)) private _hasCommitted;
    mapping(uint256 => mapping(address => bool)) private _hasRevealed;
    mapping(uint256 => mapping(address => uint256)) private _revealedAmounts;
    mapping(uint256 => address[]) private _committedMembers;

    mapping(uint256 => address) public override winnerOf;
    mapping(uint256 => uint256) public winningBidOf;
    mapping(uint256 => bool) public cycleSettled;

    error NotInBiddingPhase();
    error NotInCommitPhase();
    error NotInRevealPhase();
    error NotCircleMember();
    error MemberAlreadyWon();
    error MemberMissedPayment();
    error AlreadyCommitted();
    error InvalidCommitment();
    error NotCommitted();
    error AlreadyRevealed();
    error CommitmentMismatch();
    error BidBelowFloor();
    error BidAbovePool();
    error CycleAlreadySettled();

    constructor(address _poolVault) {
        require(_poolVault != address(0), "Invalid vault address");
        poolVault = IPool(_poolVault);
    }

    /**
     * @notice Checks whether an address is an authorized circle member
     */
    function _isMember(address account) internal view returns (bool) {
        address[] memory memberList = poolVault.members();
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == account) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Commit a secret bid hash.
     * @param commitment keccak256(abi.encodePacked(bidAmount, salt, msg.sender))
     */
    function commitBid(bytes32 commitment) external override {
        if (poolVault.phase() != IPool.Phase.Bidding) revert NotInBiddingPhase();
        if (bidPhase != BidPhase.Commit) revert NotInCommitPhase();
        if (!_isMember(msg.sender)) revert NotCircleMember();
        if (poolVault.hasWon(msg.sender)) revert MemberAlreadyWon();
        if (poolVault.hasMissed(msg.sender)) revert MemberMissedPayment();
        
        uint256 cycle = poolVault.currentCycle();
        if (_hasCommitted[cycle][msg.sender]) revert AlreadyCommitted();
        if (commitment == bytes32(0)) revert InvalidCommitment();

        _commitments[cycle][msg.sender] = commitment;
        _commitTimestamps[cycle][msg.sender] = uint64(block.timestamp);
        _hasCommitted[cycle][msg.sender] = true;
        _committedMembers[cycle].push(msg.sender);

        emit BidCommitted(cycle, msg.sender);
    }

    /**
     * @notice Scheduler transition: Commit -> Reveal
     */
    function openReveal() external override {
        if (bidPhase != BidPhase.Commit) revert NotInCommitPhase();
        bidPhase = BidPhase.Reveal;
    }

    /**
     * @notice Scheduler transition: Open Commit for a new cycle
     */
    function openCommit() external {
        bidPhase = BidPhase.Commit;
    }

    /**
     * @notice Reveal a committed bid with the original amount and secret salt.
     * @param bidAmount The bid amount in base units
     * @param salt The secret salt used during commitment
     */
    function revealBid(uint256 bidAmount, bytes32 salt) external override {
        if (bidPhase != BidPhase.Reveal) revert NotInRevealPhase();

        uint256 cycle = poolVault.currentCycle();
        if (!_hasCommitted[cycle][msg.sender]) revert NotCommitted();
        if (_hasRevealed[cycle][msg.sender]) revert AlreadyRevealed();

        bytes32 computedCommitment = keccak256(abi.encodePacked(bidAmount, salt, msg.sender));
        if (computedCommitment != _commitments[cycle][msg.sender]) revert CommitmentMismatch();

        uint256 currentPool = poolVault.poolAmount();
        uint256 minBid = (currentPool * MIN_BID_BPS) / BPS_DENOMINATOR;

        if (bidAmount < minBid) revert BidBelowFloor();
        if (bidAmount > currentPool) revert BidAbovePool();

        _hasRevealed[cycle][msg.sender] = true;
        _revealedAmounts[cycle][msg.sender] = bidAmount;

        emit BidRevealed(cycle, msg.sender, bidAmount);
    }

    /**
     * @notice Settle the auction: pick lowest valid bid, break ties by earliest commit timestamp,
     *         payout winner and credit remaining pool as dividend to next cycle.
     */
    function settle() external override {
        if (bidPhase != BidPhase.Reveal) revert NotInRevealPhase();

        uint256 cycle = poolVault.currentCycle();
        if (cycleSettled[cycle]) revert CycleAlreadySettled();

        address[] memory membersCommitted = _committedMembers[cycle];
        address lowestBidder = address(0);
        uint256 lowestBid = type(uint256).max;
        uint64 earliestCommit = type(uint64).max;

        for (uint256 i = 0; i < membersCommitted.length; i++) {
            address member = membersCommitted[i];
            if (!_hasRevealed[cycle][member]) {
                emit BidDiscarded(cycle, member);
            } else {
                uint256 amount = _revealedAmounts[cycle][member];
                uint64 commitTime = _commitTimestamps[cycle][member];

                if (amount < lowestBid) {
                    lowestBid = amount;
                    lowestBidder = member;
                    earliestCommit = commitTime;
                } else if (amount == lowestBid && commitTime < earliestCommit) {
                    lowestBidder = member;
                    earliestCommit = commitTime;
                }
            }
        }

        uint256 currentPool = poolVault.poolAmount();

        if (lowestBidder == address(0)) {
            // No bids or no valid reveals -> rollover full pool as dividend
            emit NoBids(cycle);
            poolVault.creditDividend(currentPool);
        } else {
            winnerOf[cycle] = lowestBidder;
            winningBidOf[cycle] = lowestBid;

            poolVault.payout(lowestBidder, lowestBid);

            uint256 dividend = currentPool - lowestBid;
            if (dividend > 0) {
                poolVault.creditDividend(dividend);
            }
            emit WinnerSelected(cycle, lowestBidder, lowestBid);
        }

        bidPhase = BidPhase.Settled;
        cycleSettled[cycle] = true;
    }

    /**
     * @notice View list of bids for a given cycle. Hidden bids return amount 0 until revealed.
     */
    function bidList(uint256 cycle) external view override returns (BidView[] memory) {
        address[] memory membersCommitted = _committedMembers[cycle];
        BidView[] memory views = new BidView[](membersCommitted.length);

        for (uint256 i = 0; i < membersCommitted.length; i++) {
            address member = membersCommitted[i];
            bool revealed = _hasRevealed[cycle][member];
            views[i] = BidView({
                member: member,
                amount: revealed ? _revealedAmounts[cycle][member] : 0,
                revealed: revealed,
                committedAt: _commitTimestamps[cycle][member]
            });
        }

        return views;
    }

    /**
     * @notice Helper to check if a specific member has committed in a cycle
     */
    function hasMemberCommitted(uint256 cycle, address member) external view returns (bool) {
        return _hasCommitted[cycle][member];
    }

    /**
     * @notice Helper to check if a specific member has revealed in a cycle
     */
    function hasMemberRevealed(uint256 cycle, address member) external view returns (bool) {
        return _hasRevealed[cycle][member];
    }

    /**
     * @notice Returns total number of committed bids for a cycle (count only, privacy preserved)
     */
    function committedCount(uint256 cycle) external view returns (uint256) {
        return _committedMembers[cycle].length;
    }
}
