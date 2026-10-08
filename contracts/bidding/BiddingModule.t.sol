// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BiddingModule.sol";
import "./MockPool.sol";

interface Vm {
    function warp(uint256) external;
    function prank(address) external;
}

contract BiddingModuleTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockPool pool;
    BiddingModule bidding;

    address member1 = address(0x1111);
    address member2 = address(0x2222);
    address member3 = address(0x3333);
    address member4 = address(0x4444);
    address member5 = address(0x5555);

    function setUp() public {
        address[] memory members = new address[](5);
        members[0] = member1;
        members[1] = member2;
        members[2] = member3;
        members[3] = member4;
        members[4] = member5;

        pool = new MockPool(members);
        pool.setPoolAmount(5000000000); // 5000 USDC
        bidding = new BiddingModule(address(pool));
    }

    function test_CommitAndReveal_LowestBidWins() public {
        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");

        uint256 bid1 = 3800000000; // 3800 USDC
        uint256 bid2 = 3200000000; // 3200 USDC (lower)

        bytes32 commit1 = keccak256(abi.encodePacked(bid1, salt1, member1));
        bytes32 commit2 = keccak256(abi.encodePacked(bid2, salt2, member2));

        vm.prank(member1);
        bidding.commitBid(commit1);

        vm.prank(member2);
        bidding.commitBid(commit2);

        // Transition to reveal
        bidding.openReveal();

        vm.prank(member1);
        bidding.revealBid(bid1, salt1);

        vm.prank(member2);
        bidding.revealBid(bid2, salt2);

        // Settle
        bidding.settle();

        require(bidding.winnerOf(1) == member2, "Member 2 should win");
        require(bidding.winningBidOf(1) == bid2, "Winning bid should match");
    }

    function test_TieGoesToEarliestCommit() public {
        bytes32 salt1 = keccak256("salt1");
        bytes32 salt2 = keccak256("salt2");
        uint256 bid = 3500000000;

        bytes32 commit1 = keccak256(abi.encodePacked(bid, salt1, member1));
        bytes32 commit2 = keccak256(abi.encodePacked(bid, salt2, member2));

        vm.warp(1000);
        vm.prank(member1);
        bidding.commitBid(commit1);

        vm.warp(2000);
        vm.prank(member2);
        bidding.commitBid(commit2);

        bidding.openReveal();

        vm.prank(member1);
        bidding.revealBid(bid, salt1);

        vm.prank(member2);
        bidding.revealBid(bid, salt2);

        bidding.settle();

        require(bidding.winnerOf(1) == member1, "Tie should go to earliest commit (member1)");
    }

    function test_FloorBidCheck() public {
        bytes32 salt = keccak256("salt");
        uint256 bidBelowFloor = 2000000000; // 2000 USDC < 50% of 5000 (2500)
        bytes32 commit = keccak256(abi.encodePacked(bidBelowFloor, salt, member1));

        vm.prank(member1);
        bidding.commitBid(commit);

        bidding.openReveal();

        bool failed = false;
        try bidding.revealBid(bidBelowFloor, salt) {
            failed = false;
        } catch {
            failed = true;
        }
        require(failed, "Bid below 50% floor must fail");
    }

    function test_NoBidsRollover() public {
        bidding.openReveal();
        bidding.settle();

        require(bidding.winnerOf(1) == address(0), "Winner should be 0 on rollover");
        require(pool.getDividendRecordsCount() == 1, "Full pool credited as dividend");
    }
}
