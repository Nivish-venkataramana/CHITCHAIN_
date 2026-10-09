// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IAaveYieldStrategy} from "./IAaveYieldStrategy.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title AaveYieldStrategy
 * @notice Restricted yield strategy adapter routing circle surplus capital into Aave V3 lending pools.
 * @dev All withdrawals route strictly to the parent circle PoolVault.
 */
contract AaveYieldStrategy is IAaveYieldStrategy, Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public override vault;
    IERC20 public override underlyingToken;
    address public override aavePool;
    IERC20 public override aToken;

    uint256 public override cumulativeSupplies;
    uint256 public override cumulativeWithdrawals;
    bool public override suppliesPaused;

    // Simulated testnet yield buffer when external Aave Pool is not present
    uint256 internal _mockYieldAccumulator;

    error NotAuthorizedVault();
    error SuppliesArePaused();
    error ZeroAmount();
    error InvalidConfiguration();

    modifier onlyVault() {
        if (msg.sender != vault) revert NotAuthorizedVault();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the strategy clone.
     */
    function initialize(
        address _vault,
        address _underlyingToken,
        address _aavePool,
        address _aToken
    ) external initializer {
        if (_vault == address(0) || _underlyingToken == address(0)) revert InvalidConfiguration();
        vault = _vault;
        underlyingToken = IERC20(_underlyingToken);
        aavePool = _aavePool;
        if (_aToken != address(0)) {
            aToken = IERC20(_aToken);
        }
    }

    /**
     * @notice Supplies underlying assets from the vault into the Aave Pool.
     */
    function supply(uint256 amount) external override onlyVault nonReentrant {
        if (suppliesPaused) revert SuppliesArePaused();
        if (amount == 0) revert ZeroAmount();

        cumulativeSupplies += amount;

        // Pull tokens from vault
        underlyingToken.safeTransferFrom(vault, address(this), amount);

        if (aavePool != address(0)) {
            underlyingToken.forceApprove(aavePool, amount);
            IAavePool(aavePool).supply(address(underlyingToken), amount, address(this), 0);
        }

        emit Supplied(vault, amount, block.timestamp);
    }

    /**
     * @notice Withdraws underlying assets from Aave directly back to the vault.
     */
    function withdraw(uint256 amount) public override onlyVault nonReentrant returns (uint256 actualAmount) {
        if (amount == 0) revert ZeroAmount();

        cumulativeWithdrawals += amount;

        if (aavePool != address(0)) {
            actualAmount = IAavePool(aavePool).withdraw(address(underlyingToken), amount, vault);
        } else {
            actualAmount = amount;
            underlyingToken.safeTransfer(vault, amount);
        }

        emit Withdrawn(vault, actualAmount, block.timestamp);
        return actualAmount;
    }

    /**
     * @notice Withdraws all current strategy assets back to the vault.
     */
    function withdrawAll() external override onlyVault returns (uint256) {
        uint256 currentPos = positionValue();
        if (currentPos == 0) return 0;
        return withdraw(currentPos);
    }

    /**
     * @notice Returns total current position value (aTokens + idle underlying held in strategy).
     */
    function positionValue() public view override returns (uint256) {
        uint256 idle = underlyingToken.balanceOf(address(this));
        if (address(aToken) != address(0)) {
            return aToken.balanceOf(address(this)) + idle;
        }
        return idle + _mockYieldAccumulator;
    }

    /**
     * @notice Pauses new supplies in emergency.
     */
    function pauseSupply() external override onlyVault {
        suppliesPaused = true;
        emit SupplyPaused(msg.sender);
    }

    /**
     * @notice Resumes supplies.
     */
    function resumeSupply() external override onlyVault {
        suppliesPaused = false;
        emit SupplyResumed(msg.sender);
    }
}
