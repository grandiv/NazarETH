// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/INazarYield.sol";

contract MockMorpho is INazarYield, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");

    IERC20 public immutable usdc;

    uint256 private _principal;
    uint256 private _lastAccrual;
    uint256 private _accumulatedYield;

    uint256 public constant APY_BPS = 500;

    event Deposited(uint256 amount, uint256 newPrincipal);
    event Withdrawn(address indexed recipient, uint256 amount, uint256 yieldEarned);
    event YieldAccrued(uint256 yieldAmount);

    constructor(address admin, address usdcAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        usdc = IERC20(usdcAddress);
        _lastAccrual = block.timestamp;
    }

    function _accrueYield() internal {
        if (_principal == 0) {
            _lastAccrual = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - _lastAccrual;
        if (elapsed == 0) return;
        uint256 yieldAmount = (_principal * APY_BPS * elapsed) / (10_000 * 365 days);
        if (yieldAmount > 0) {
            _accumulatedYield += yieldAmount;
            emit YieldAccrued(yieldAmount);
        }
        _lastAccrual = block.timestamp;
    }

    function deposit(uint256 amount) external override onlyRole(CHALLENGE_ROLE) nonReentrant {
        _accrueYield();
        _principal += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(amount, _principal);
    }

    function withdraw(address recipient, uint256 amount)
        external
        override
        onlyRole(CHALLENGE_ROLE)
        nonReentrant
    {
        _accrueYield();
        uint256 totalAssets = _principal + _accumulatedYield;
        require(amount <= totalAssets, "insufficient balance");

        if (amount <= _principal) {
            _principal -= amount;
        } else {
            uint256 yieldUsed = amount - _principal;
            _principal = 0;
            _accumulatedYield -= yieldUsed;
        }

        usdc.safeTransfer(recipient, amount);
        emit Withdrawn(recipient, amount, 0);
    }

    function totalDeposited() external view override returns (uint256) {
        return _principal;
    }

    function totalAssets() external view returns (uint256) {
        uint256 elapsed = block.timestamp - _lastAccrual;
        uint256 pendingYield = (_principal * APY_BPS * elapsed) / (10_000 * 365 days);
        return _principal + _accumulatedYield + pendingYield;
    }

    function currentYield() external view returns (uint256) {
        return _accumulatedYield;
    }

    function apyBps() external pure returns (uint256) {
        return APY_BPS;
    }
}
