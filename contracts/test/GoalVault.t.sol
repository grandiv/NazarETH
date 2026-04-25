// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GoalVault} from "../src/GoalVault.sol";
import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";
import {ECDSA} from "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract GoalVaultTest is Test {
    GoalVault public vault;
    MockUSDC public usdc;

    address owner = address(0x1);
    address user = address(0x2);
    address signer;
    uint256 signerPk;

    uint256 constant DEPOSIT_AMOUNT = 100e6;
    uint256 constant FEE_BPS = 150;
    uint256 constant BASIS_POINTS = 10_000;

    function setUp() public {
        (signer, signerPk) = makeAddrAndKey("signer");
        usdc = new MockUSDC();
        vault = new GoalVault(address(usdc), signer, owner);
        usdc.mint(user, 10_000e6);
    }

    function _createAndDeposit(uint256 targetValue, uint256 deadlineSeconds) internal returns (uint256) {
        uint256 deadline = block.timestamp + deadlineSeconds;
        vm.prank(user);
        uint256 goalId = vault.createGoal(GoalVault.GoalType.Distance, targetValue, deadline);

        vm.prank(user);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);

        vm.prank(user);
        vault.deposit(goalId, DEPOSIT_AMOUNT);

        return goalId;
    }

    function _buildDomainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("NazarETH GoalVault"),
                keccak256("1"),
                block.chainid,
                address(vault)
            )
        );
    }

    function _signSettlement(uint256 goalId, uint256 actualValue, uint256 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Settlement(uint256 goalId,uint256 actualValue,uint256 timestamp)"),
                goalId,
                actualValue,
                timestamp
            )
        );
        bytes32 domainSeparator = _buildDomainSeparator();
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_createGoal() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(user);
        uint256 goalId = vault.createGoal(GoalVault.GoalType.Distance, 10_000, deadline);

        GoalVault.Goal memory goal = vault.getGoal(goalId);
        assertEq(goal.user, user);
        assertEq(uint256(goal.goalType), uint256(GoalVault.GoalType.Distance));
        assertEq(goal.targetValue, 10_000);
        assertEq(uint256(goal.status), uint256(GoalVault.GoalStatus.Active));
        assertEq(goal.settled, false);
    }

    function test_deposit() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        GoalVault.Goal memory goal = vault.getGoal(goalId);
        uint256 fee = (DEPOSIT_AMOUNT * FEE_BPS) / BASIS_POINTS;
        assertEq(goal.stakeAmount, DEPOSIT_AMOUNT - fee);
        assertEq(goal.depositedAt, block.timestamp);
    }

    function test_settleGoal_achieved() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        uint256 timestamp = block.timestamp;
        bytes memory sig = _signSettlement(goalId, 10_000, timestamp);

        vault.settleGoal(goalId, 10_000, timestamp, sig);

        GoalVault.Goal memory goal = vault.getGoal(goalId);
        assertEq(uint256(goal.status), uint256(GoalVault.GoalStatus.Achieved));
        assertTrue(goal.settled);
    }

    function test_claimBack_achieved() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 10_000, block.timestamp);
        vault.settleGoal(goalId, 10_000, block.timestamp, sig);

        uint256 balBefore = usdc.balanceOf(user);
        vm.prank(user);
        vault.claimBack(goalId);

        uint256 fee = (DEPOSIT_AMOUNT * FEE_BPS) / BASIS_POINTS;
        assertEq(usdc.balanceOf(user), balBefore + DEPOSIT_AMOUNT - fee);
    }

    function test_settleGoal_failed_50percent() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 5_000, block.timestamp);

        vault.settleGoal(goalId, 5_000, block.timestamp, sig);

        GoalVault.Goal memory goal = vault.getGoal(goalId);
        assertEq(uint256(goal.status), uint256(GoalVault.GoalStatus.Failed));
        assertEq(goal.actualValue, 5_000);
    }

    function test_claimBack_failed_50percent() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 5_000, block.timestamp);
        vault.settleGoal(goalId, 5_000, block.timestamp, sig);

        uint256 fee = (DEPOSIT_AMOUNT * FEE_BPS) / BASIS_POINTS;
        uint256 stakeAfterFee = DEPOSIT_AMOUNT - fee;

        uint256 slashBps = 8000 - ((5000 * 10000 / 10000) * 8000 / 10000);
        uint256 slashAmount = (stakeAfterFee * slashBps) / 10000;
        uint256 expectedReturn = stakeAfterFee - slashAmount;

        uint256 balBefore = usdc.balanceOf(user);
        vm.prank(user);
        vault.claimBack(goalId);

        assertEq(usdc.balanceOf(user), balBefore + expectedReturn);
    }

    function test_settleGoal_failed_0percent() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 0, block.timestamp);

        vault.settleGoal(goalId, 0, block.timestamp, sig);

        GoalVault.Goal memory goal = vault.getGoal(goalId);
        assertEq(uint256(goal.status), uint256(GoalVault.GoalStatus.Failed));
    }

    function test_claimBack_failed_0percent() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 0, block.timestamp);
        vault.settleGoal(goalId, 0, block.timestamp, sig);

        uint256 fee = (DEPOSIT_AMOUNT * FEE_BPS) / BASIS_POINTS;
        uint256 stakeAfterFee = DEPOSIT_AMOUNT - fee;
        uint256 slashAmount = (stakeAfterFee * 8000) / 10000;
        uint256 expectedReturn = stakeAfterFee - slashAmount;

        uint256 balBefore = usdc.balanceOf(user);
        vm.prank(user);
        vault.claimBack(goalId);

        assertEq(usdc.balanceOf(user), balBefore + expectedReturn);
    }

    function test_revert_invalidSignature() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        (, uint256 fakePk) = makeAddrAndKey("fake");
        bytes memory fakeSig;
        {
            bytes32 structHash = keccak256(
                abi.encode(
                    keccak256("Settlement(uint256 goalId,uint256 actualValue,uint256 timestamp)"),
                    goalId,
                    10_000,
                    block.timestamp
                )
            );
            bytes32 domainSeparator = _buildDomainSeparator();
            bytes32 digest = keccak256(
                abi.encodePacked("\x19\x01", domainSeparator, structHash)
            );
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakePk, digest);
            fakeSig = abi.encodePacked(r, s, v);
        }

        vm.expectRevert(GoalVault.InvalidSignature.selector);
        vault.settleGoal(goalId, 10_000, block.timestamp, fakeSig);
    }

    function test_revert_notOwner() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.prank(address(0x99));
        vm.expectRevert(GoalVault.NotGoalOwner.selector);
        vault.deposit(goalId, 100e6);
    }

    function test_communityPoolAccumulates() public {
        uint256 goalId = _createAndDeposit(10_000, 7 days);

        vm.warp(block.timestamp + 8 days);
        bytes memory sig = _signSettlement(goalId, 0, block.timestamp);
        vault.settleGoal(goalId, 0, block.timestamp, sig);

        uint256 fee = (DEPOSIT_AMOUNT * FEE_BPS) / BASIS_POINTS;
        uint256 stakeAfterFee = DEPOSIT_AMOUNT - fee;
        uint256 slashAmount = (stakeAfterFee * 8000) / 10000;
        uint256 expectedPool = (slashAmount * 60) / 100;

        assertEq(vault.communityPoolBalance(), expectedPool);
        assertEq(vault.totalSlashed(), slashAmount);
    }
}
