// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBidding
 * @notice Interface for ChitChain bidding module on Base Sepolia.
 */
interface IBidding {
    enum BidPhase {
        Closed,
        Commit,
        Reveal,
        Settled
    }

    struct BidView {
        address member;
        uint256 amount;
        bool revealed;
        uint64 committedAt;
    }

    function bidPhase() external view returns (BidPhase);
    function commitBid(bytes32 commitment) external; // member
    function revealBid(uint256 bidAmount, bytes32 salt) external; // member
    function openReveal() external; // scheduler: Commit -> Reveal
    function settle() external; // scheduler: pick winner, pay out, credit dividend
    function bidList(uint256 cycle) external view returns (BidView[] memory); // amounts only after reveal
    function winnerOf(uint256 cycle) external view returns (address);

    event BidCommitted(uint256 indexed cycle, address indexed member); // never emit the commitment contents
    event BidRevealed(uint256 indexed cycle, address indexed member, uint256 amount);
    event BidDiscarded(uint256 indexed cycle, address indexed member); // committed, never revealed
    event WinnerSelected(uint256 indexed cycle, address indexed winner, uint256 amount);
    event NoBids(uint256 indexed cycle);
}
