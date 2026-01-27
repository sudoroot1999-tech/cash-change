// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LPToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract LiquidityPoolFactory is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Pool {
        address token0;
        address token1;
        address lpToken;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
        uint256 rewardRate;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
        uint256 feePercentage; // in basis points
        bool active;
    }

    struct UserPosition {
        uint256 lpAmount;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 token0Deposited;
        uint256 token1Deposited;
        uint256 lastUpdateTime;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => UserPosition)) public positions;
    mapping(address => bytes32[]) public userPools;
    
    bytes32[] public allPools;
    IERC20 public rewardToken;
    
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;

    event PoolCreated(bytes32 indexed poolId, address token0, address token1, address lpToken);
    event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event RewardsClaimed(bytes32 indexed poolId, address indexed user, uint256 amount);
    event Swap(bytes32 indexed poolId, address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }

    function createPool(
        address _token0,
        address _token1,
        uint256 _rewardRate,
        uint256 _feePercentage
    ) external onlyOwner returns (bytes32) {
        require(_token0 != _token1, "Identical tokens");
        require(_token0 != address(0) && _token1 != address(0), "Zero address");
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%

        (address tokenA, address tokenB) = _token0 < _token1 ? (_token0, _token1) : (_token1, _token0);
        bytes32 poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        
        require(pools[poolId].lpToken == address(0), "Pool exists");

        string memory lpName = string(abi.encodePacked("LP-", ERC20(tokenA).symbol(), "-", ERC20(tokenB).symbol()));
        string memory lpSymbol = string(abi.encodePacked(ERC20(tokenA).symbol(), "-", ERC20(tokenB).symbol()));
        
        LPToken lpToken = new LPToken(lpName, lpSymbol);

        Pool storage pool = pools[poolId];
        pool.token0 = tokenA;
        pool.token1 = tokenB;
        pool.lpToken = address(lpToken);
        pool.rewardRate = _rewardRate;
        pool.lastRewardTime = block.timestamp;
        pool.feePercentage = _feePercentage;
        pool.active = true;

        allPools.push(poolId);

        emit PoolCreated(poolId, tokenA, tokenB, address(lpToken));
        return poolId;
    }

    function addLiquidity(
        bytes32 _poolId,
        uint256 _amount0,
        uint256 _amount1,
        uint256 _minLiquidity
    ) external nonReentrant returns (uint256 liquidity) {
        Pool storage pool = pools[_poolId];
        require(pool.active, "Pool not active");

        updatePoolRewards(_poolId);

        IERC20(pool.token0).safeTransferFrom(msg.sender, address(this), _amount0);
        IERC20(pool.token1).safeTransferFrom(msg.sender, address(this), _amount1);

        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(_amount0 * _amount1) - MINIMUM_LIQUIDITY;
            LPToken(pool.lpToken).mint(address(1), MINIMUM_LIQUIDITY); // Lock minimum liquidity
        } else {
            uint256 liquidity0 = (_amount0 * pool.totalLiquidity) / pool.reserve0;
            uint256 liquidity1 = (_amount1 * pool.totalLiquidity) / pool.reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }

        require(liquidity >= _minLiquidity, "Insufficient liquidity minted");

        pool.reserve0 += _amount0;
        pool.reserve1 += _amount1;
        pool.totalLiquidity += liquidity;

        LPToken(pool.lpToken).mint(address(this), liquidity);

        UserPosition storage position = positions[_poolId][msg.sender];
        
        if (position.lpAmount > 0) {
            position.pendingRewards += ((position.lpAmount * pool.accRewardPerShare) / PRECISION) - position.rewardDebt;
        }

        position.lpAmount += liquidity;
        position.token0Deposited += _amount0;
        position.token1Deposited += _amount1;
        position.rewardDebt = (position.lpAmount * pool.accRewardPerShare) / PRECISION;
        position.lastUpdateTime = block.timestamp;

        if (userPools[msg.sender].length == 0 || userPools[msg.sender][userPools[msg.sender].length - 1] != _poolId) {
            userPools[msg.sender].push(_poolId);
        }

        emit LiquidityAdded(_poolId, msg.sender, _amount0, _amount1, liquidity);
    }

    function removeLiquidity(
        bytes32 _poolId,
        uint256 _liquidity,
        uint256 _minAmount0,
        uint256 _minAmount1
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        Pool storage pool = pools[_poolId];
        UserPosition storage position = positions[_poolId][msg.sender];
        
        require(position.lpAmount >= _liquidity, "Insufficient liquidity");

        updatePoolRewards(_poolId);
        
        // Claim pending rewards
        uint256 pending = ((position.lpAmount * pool.accRewardPerShare) / PRECISION) - position.rewardDebt + position.pendingRewards;
        if (pending > 0) {
            position.pendingRewards = 0;
            safeRewardTransfer(msg.sender, pending);
            emit RewardsClaimed(_poolId, msg.sender, pending);
        }

        amount0 = (_liquidity * pool.reserve0) / pool.totalLiquidity;
        amount1 = (_liquidity * pool.reserve1) / pool.totalLiquidity;

        require(amount0 >= _minAmount0 && amount1 >= _minAmount1, "Insufficient output amount");

        position.lpAmount -= _liquidity;
        position.rewardDebt = (position.lpAmount * pool.accRewardPerShare) / PRECISION;

        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;
        pool.totalLiquidity -= _liquidity;

        LPToken(pool.lpToken).burn(address(this), _liquidity);

        IERC20(pool.token0).safeTransfer(msg.sender, amount0);
        IERC20(pool.token1).safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(_poolId, msg.sender, amount0, amount1, _liquidity);
    }

    function swap(
        bytes32 _poolId,
        address _tokenIn,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        Pool storage pool = pools[_poolId];
        require(pool.active, "Pool not active");
        require(_tokenIn == pool.token0 || _tokenIn == pool.token1, "Invalid token");

        bool isToken0 = _tokenIn == pool.token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (pool.reserve0, pool.reserve1) : (pool.reserve1, pool.reserve0);

        // Calculate output amount with fee
        uint256 amountInWithFee = _amountIn * (BASIS_POINTS - pool.feePercentage);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * BASIS_POINTS + amountInWithFee);

        require(amountOut >= _minAmountOut, "Insufficient output amount");

        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);

        address tokenOut = isToken0 ? pool.token1 : pool.token0;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update reserves
        if (isToken0) {
            pool.reserve0 += _amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += _amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swap(_poolId, msg.sender, _tokenIn, _amountIn, amountOut);
    }

    function harvestRewards(bytes32 _poolId) external nonReentrant {
        updatePoolRewards(_poolId);

        Pool storage pool = pools[_poolId];
        UserPosition storage position = positions[_poolId][msg.sender];

        uint256 pending = ((position.lpAmount * pool.accRewardPerShare) / PRECISION) - position.rewardDebt + position.pendingRewards;
        require(pending > 0, "No rewards to harvest");

        position.pendingRewards = 0;
        position.rewardDebt = (position.lpAmount * pool.accRewardPerShare) / PRECISION;

        safeRewardTransfer(msg.sender, pending);
        emit RewardsClaimed(_poolId, msg.sender, pending);
    }

    function calculateImpermanentLoss(bytes32 _poolId, address _user) external view returns (int256) {
        Pool storage pool = pools[_poolId];
        UserPosition storage position = positions[_poolId][_user];

        if (position.lpAmount == 0) return 0;

        // Calculate current value
        uint256 currentAmount0 = (position.lpAmount * pool.reserve0) / pool.totalLiquidity;
        uint256 currentAmount1 = (position.lpAmount * pool.reserve1) / pool.totalLiquidity;

        // Price ratio at deposit and current
        uint256 initialRatio = (position.token0Deposited * PRECISION) / position.token1Deposited;
        uint256 currentRatio = (pool.reserve0 * PRECISION) / pool.reserve1;

        // If price hasn't changed, no IL
        if (initialRatio == currentRatio) return 0;

        uint256 priceRatioChange = currentRatio > initialRatio 
            ? (currentRatio * PRECISION) / initialRatio 
            : (initialRatio * PRECISION) / currentRatio;

        // Simplified IL calculation
        uint256 sqrtRatio = sqrt(priceRatioChange);
        int256 il = int256((2 * sqrtRatio) / (1 + (sqrtRatio * sqrtRatio) / PRECISION)) - int256(PRECISION);

        return il;
    }

    function updatePoolRewards(bytes32 _poolId) internal {
        Pool storage pool = pools[_poolId];

        if (block.timestamp <= pool.lastRewardTime || pool.totalLiquidity == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = timeElapsed * pool.rewardRate;
        pool.accRewardPerShare += (reward * PRECISION) / pool.totalLiquidity;
        pool.lastRewardTime = block.timestamp;
    }

    function pendingReward(bytes32 _poolId, address _user) external view returns (uint256) {
        Pool storage pool = pools[_poolId];
        UserPosition storage position = positions[_poolId][_user];

        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (block.timestamp > pool.lastRewardTime && pool.totalLiquidity != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = timeElapsed * pool.rewardRate;
            accRewardPerShare += (reward * PRECISION) / pool.totalLiquidity;
        }

        return ((position.lpAmount * accRewardPerShare) / PRECISION) - position.rewardDebt + position.pendingRewards;
    }

    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.safeTransfer(_to, rewardBal);
        } else {
            rewardToken.safeTransfer(_to, _amount);
        }
    }

    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function getPoolInfo(bytes32 _poolId) external view returns (
        address token0,
        address token1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 totalLiquidity,
        uint256 rewardRate
    ) {
        Pool storage pool = pools[_poolId];
        return (
            pool.token0,
            pool.token1,
            pool.reserve0,
            pool.reserve1,
            pool.totalLiquidity,
            pool.rewardRate
        );
    }

    function getUserPosition(bytes32 _poolId, address _user) external view returns (
        uint256 lpAmount,
        uint256 token0Deposited,
        uint256 token1Deposited,
        uint256 pendingRewards
    ) {
        UserPosition storage position = positions[_poolId][_user];
        return (
            position.lpAmount,
            position.token0Deposited,
            position.token1Deposited,
            position.pendingRewards
        );
    }

    function getAllPools() external view returns (bytes32[] memory) {
        return allPools;
    }

    function getUserPools(address _user) external view returns (bytes32[] memory) {
        return userPools[_user];
    }
}
