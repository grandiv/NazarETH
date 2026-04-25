// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

contract GoalVault is Ownable, ReentrancyGuard, EIP712 {
    IERC20 public immutable USDC;

    enum GoalType {Distance, Count}
    enum GoalStatus {None, Active, Achieved, Failed}

    struct Goal {
        address user;
        GoalType goalType;
        uint256 targetValue;
        uint256 deadline;
        uint256 stakeAmount;
        uint256 actualValue;
        uint256 depositedAt;
        GoalStatus status;
        bool settled;
    }

    uint256 public nextGoalId;
    mapping(uint256 => Goal) public goals;

    address public trustedSigner;
    uint256 public platformFeeBps = 150;
    uint256 public communityPoolBalance;
    uint256 public totalSlashed;

    uint256 constant BASIS_POINTS = 10_000;
    uint256 constant SLASH_MAX_BPS = 8000;

    event GoalCreated(uint256 indexed goalId, address indexed user, GoalType goalType, uint256 targetValue, uint256 deadline);
    event Deposited(uint256 indexed goalId, uint256 amount, uint256 fee);
    event GoalSettled(uint256 indexed goalId, bool achieved, uint256 actualValue, uint256 slashAmount);
    event Claimed(uint256 indexed goalId, uint256 amount);
    event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event PlatformFeeUpdated(uint256 oldBps, uint256 newBps);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    error GoalNotFound();
    error GoalNotActive();
    error NotGoalOwner();
    error AlreadySettled();
    error DeadlineNotPassed();
    error TransferFailed();
    error InvalidSignature();
    error ZeroAmount();

    constructor(
        address _usdc,
        address _trustedSigner,
        address _owner
    ) Ownable(_owner) EIP712("NazarETH GoalVault", "1") {
        USDC = IERC20(_usdc);
        trustedSigner = _trustedSigner;
    }

    function createGoal(
        GoalType _goalType,
        uint256 _targetValue,
        uint256 _deadline
    ) external returns (uint256 goalId) {
        if (_targetValue == 0) revert ZeroAmount();
        if (_deadline <= block.timestamp) revert ZeroAmount();

        goalId = nextGoalId++;
        goals[goalId] = Goal({
            user: msg.sender,
            goalType: _goalType,
            targetValue: _targetValue,
            deadline: _deadline,
            stakeAmount: 0,
            actualValue: 0,
            depositedAt: 0,
            status: GoalStatus.Active,
            settled: false
        });

        emit GoalCreated(goalId, msg.sender, _goalType, _targetValue, _deadline);
    }

    function deposit(uint256 _goalId, uint256 _amount) external nonReentrant {
        Goal storage goal = goals[_goalId];
        if (goal.status != GoalStatus.Active) revert GoalNotActive();
        if (goal.user != msg.sender) revert NotGoalOwner();
        if (_amount == 0) revert ZeroAmount();

        uint256 fee = (_amount * platformFeeBps) / BASIS_POINTS;
        uint256 depositAmount = _amount - fee;

        if (!USDC.transferFrom(msg.sender, address(this), _amount)) revert TransferFailed();

        goal.stakeAmount = depositAmount;
        goal.depositedAt = block.timestamp;

        emit Deposited(_goalId, depositAmount, fee);
    }

    function settleGoal(
        uint256 _goalId,
        uint256 _actualValue,
        uint256 _timestamp,
        bytes calldata _signature
    ) external {
        Goal storage goal = goals[_goalId];
        if (goal.status != GoalStatus.Active) revert GoalNotActive();
        if (block.timestamp < goal.deadline) revert DeadlineNotPassed();
        if (goal.settled) revert AlreadySettled();

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Settlement(uint256 goalId,uint256 actualValue,uint256 timestamp)"),
                _goalId,
                _actualValue,
                _timestamp
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, _signature);
        if (signer != trustedSigner) revert InvalidSignature();

        goal.actualValue = _actualValue;
        goal.settled = true;

        if (_actualValue >= goal.targetValue) {
            goal.status = GoalStatus.Achieved;
            emit GoalSettled(_goalId, true, _actualValue, 0);
        } else {
            goal.status = GoalStatus.Failed;

            uint256 progressBps = (_actualValue * BASIS_POINTS) / goal.targetValue;
            uint256 slashBps = SLASH_MAX_BPS - ((progressBps * SLASH_MAX_BPS) / BASIS_POINTS);
            uint256 slashAmount = (goal.stakeAmount * slashBps) / BASIS_POINTS;

            communityPoolBalance += (slashAmount * 60) / 100;
            totalSlashed += slashAmount;

            emit GoalSettled(_goalId, false, _actualValue, slashAmount);
        }
    }

    function claimBack(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        if (goal.user != msg.sender) revert NotGoalOwner();
        if (!goal.settled) revert AlreadySettled();

        uint256 amount;
        if (goal.status == GoalStatus.Achieved) {
            amount = goal.stakeAmount;
            goal.status = GoalStatus.None;
        } else if (goal.status == GoalStatus.Failed) {
            uint256 progressBps = (goal.actualValue * BASIS_POINTS) / goal.targetValue;
            uint256 slashBps = SLASH_MAX_BPS - ((progressBps * SLASH_MAX_BPS) / BASIS_POINTS);
            uint256 slashAmount = (goal.stakeAmount * slashBps) / BASIS_POINTS;
            amount = goal.stakeAmount - slashAmount;
            goal.status = GoalStatus.None;
        } else {
            revert AlreadySettled();
        }

        goal.stakeAmount = 0;
        if (!USDC.transfer(msg.sender, amount)) revert TransferFailed();

        emit Claimed(_goalId, amount);
    }

    function withdrawTreasury(address _to, uint256 _amount) external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        uint256 available = balance - _lockedFunds() - communityPoolBalance;
        if (_amount > available) revert ZeroAmount();
        if (!USDC.transfer(_to, _amount)) revert TransferFailed();
        emit TreasuryWithdrawn(_to, _amount);
    }

    function withdrawCommunityPool(address _to, uint256 _amount) external onlyOwner {
        if (_amount > communityPoolBalance) revert ZeroAmount();
        communityPoolBalance -= _amount;
        if (!USDC.transfer(_to, _amount)) revert TransferFailed();
    }

    function setTrustedSigner(address _newSigner) external onlyOwner {
        address old = trustedSigner;
        trustedSigner = _newSigner;
        emit TrustedSignerUpdated(old, _newSigner);
    }

    function setPlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "max 10%");
        uint256 old = platformFeeBps;
        platformFeeBps = _bps;
        emit PlatformFeeUpdated(old, _bps);
    }

    function getGoal(uint256 _goalId) external view returns (Goal memory) {
        return goals[_goalId];
    }

    function _lockedFunds() internal view returns (uint256) {
        uint256 locked;
        for (uint256 i = 0; i < nextGoalId; i++) {
            if (goals[i].status == GoalStatus.Active || goals[i].status == GoalStatus.Failed) {
                locked += goals[i].stakeAmount;
            }
        }
        return locked;
    }
}
