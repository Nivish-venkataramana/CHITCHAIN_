// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IBidding.sol";
import "../pool/IPool.sol";

/**
 * @title BiddingModule
 * @notice Secret commit-reveal bidding module for ChitChain circles on Base Sepolia.
 * @dev Lowest valid bid wins; ties go to earliest commit timestamp; remainder credited as dividend.
 */
contract BiddingModule is IBidding {
    IPool public immutable pool;
    uint256 public constant MIN_BID_BPS = 5000; // 50% floor of poolAmount (DEFAULT D3)
    uint256 public constant BPS_DENOMINATOR = 10000;

    BidPhase public override bidPhase = BidPhase.Commit;

    struct CommitRecord {
        bytes32 commitment;
        uint64 committedAt;
        bool exists;
    }

    struct RevealRecord {
        uint256 amount;
        bool revealed;
    }

    // cycle => member => CommitRecord
    mapping(uint256 => mapping(address => CommitRecord)) public commits;
    // cycle => member => RevealRecord
    mapping(uint256 => mapping(address => RevealRecord)) public reveals;
    // cycle => list of members who committed
    mapping(uint256 => address[]) public committedMembers;
    // cycle => winner
    mapping(uint256 => address) public override winnerOf;
    mapping(uint256 => uint256) public winningBidOf;
    mapping(uint256 => bool) public cycleSettled;

    constructor(address _pool) {
        require(_pool != address(0), "Zero address");
        pool = IPool(_pool);
        bidPhase = BidPhase.Commit;
    }

    function _isMember(address account) internal view returns (bool) {
        address[] memory memberList = pool.members();
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == account) {
                return true;
            }
        }
        return false;
    }

    function commitBid(bytes32 commitment) external override {
        require(bidPhase == BidPhase.Commit, "Commit phase closed");
        require(_isMember(msg.sender), "Not circle member");
        require(!pool.hasWon(msg.sender), "Member already won");
        require(!pool.hasMissed(msg.sender), "Member missed payment");
        
        uint256 cycle = pool.currentCycle();
        require(!commits[cycle][msg.sender].exists, "Bid already committed for this cycle");
        require(commitment != bytes32(0), "Empty commitment");

        commits[cycle][msg.sender] = CommitRecord({
            commitment: commitment,
            committedAt: uint64(block.timestamp),
            exists: true
        });

        committedMembers[cycle].push(msg.sender);
        emit BidCommitted(cycle, msg.sender);
    }

    function openReveal() external override {
        require(bidPhase == BidPhase.Commit, "Must be in commit phase");
        bidPhase = BidPhase.Reveal;
    }

    function openCommit() external {
        bidPhase = BidPhase.Commit;
    }

    function revealBid(uint256 bidAmount, bytes32 salt) external override {
        require(bidPhase == BidPhase.Reveal, "Reveal phase closed");
        uint256 cycle = pool.currentCycle();

        CommitRecord memory rec = commits[cycle][msg.sender];
        require(rec.exists, "No commitment found");
        require(!reveals[cycle][msg.sender].revealed, "Already revealed");

        // Verify hash: keccak256(abi.encodePacked(bidAmount, salt, msg.sender))
        bytes32 expected = keccak256(abi.encodePacked(bidAmount, salt, msg.sender));
        require(expected == rec.commitment, "Invalid bid reveal or salt");

        uint256 totalPool = pool.poolAmount();
        uint256 floor = (totalPool * MIN_BID_BPS) / BPS_DENOMINATOR;
        require(bidAmount >= floor, "Bid below 50% floor");
        require(bidAmount <= totalPool, "Bid exceeds total pool");

        reveals[cycle][msg.sender] = RevealRecord({
            amount: bidAmount,
            revealed: true
        });

        emit BidRevealed(cycle, msg.sender, bidAmount);
    }

    function settle() external override {
        require(bidPhase == BidPhase.Reveal, "Must be in reveal phase");
        uint256 cycle = pool.currentCycle();
        require(!cycleSettled[cycle], "Cycle already settled");

        uint256 totalPool = pool.poolAmount();
        address[] memory membersList = committedMembers[cycle];
        address winningMember = address(0);
        uint256 lowestBid = type(uint256).max;
        uint64 earliestCommit = type(uint64).max;

        for (uint256 i = 0; i < membersList.length; i++) {
            address m = membersList[i];
            RevealRecord memory rev = reveals[cycle][m];
            CommitRecord memory com = commits[cycle][m];

            if (!rev.revealed) {
                emit BidDiscarded(cycle, m);
            } else {
                if (rev.amount < lowestBid) {
                    lowestBid = rev.amount;
                    earliestCommit = com.committedAt;
                    winningMember = m;
                } else if (rev.amount == lowestBid && com.committedAt < earliestCommit) {
                    earliestCommit = com.committedAt;
                    winningMember = m;
                }
            }
        }

        if (winningMember != address(0)) {
            winnerOf[cycle] = winningMember;
            winningBidOf[cycle] = lowestBid;
            uint256 dividend = totalPool - lowestBid;

            pool.payout(winningMember, lowestBid);
            if (dividend > 0) {
                pool.creditDividend(dividend);
            }

            emit WinnerSelected(cycle, winningMember, lowestBid);
        } else {
            // No valid revealed bids -> Rollover (DEFAULT D4)
            pool.creditDividend(totalPool);
            emit NoBids(cycle);
        }

        bidPhase = BidPhase.Settled;
        cycleSettled[cycle] = true;
    }

    function bidList(uint256 cycle) external view override returns (BidView[] memory) {
        address[] memory membersList = committedMembers[cycle];
        BidView[] memory list = new BidView[](membersList.length);

        for (uint256 i = 0; i < membersList.length; i++) {
            address m = membersList[i];
            RevealRecord memory rev = reveals[cycle][m];
            CommitRecord memory com = commits[cycle][m];

            list[i] = BidView({
                member: m,
                amount: rev.revealed ? rev.amount : 0,
                revealed: rev.revealed,
                committedAt: com.committedAt
            });
        }

        return list;
    }

    function committedCount(uint256 cycle) external view returns (uint256) {
        return committedMembers[cycle].length;
    }
}
