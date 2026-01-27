// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingContract is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 startTime;
        uint256 lockEndTime;
        bool isFlexible;
        bool autoCompound;
    }

    struct PoolInfo {
        IERC20 stakingToken;
        uint256 totalStaked;
        uint256 accRewardPerShare;
        uint256 lastRewardTime;
        uint256 rewardPerSecond;
        uint256 flexibleAPR;
        mapping(uint256 => uint256) lockedAPR; // lockDays => APR
    }

    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256) public stakeCount;
    mapping(uint256 => PoolInfo) public pools;
    uint256 public poolCount;

    IERC20 public rewardToken;
    uint256 public constant PRECISION = 1e18;
    uint256 public emergencyWithdrawPenalty = 10; // 10%

    event Staked(
        address indexed user,
        uint256 indexed poolId,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 lockDays,
        bool isFlexible
    );
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 indexed stakeId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed poolId, uint256 amount, uint256 penalty);

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }

    function createPool(
        address _stakingToken,
        uint256 _rewardPerSecond,
        uint256 _flexibleAPR
    ) external onlyOwner {
        PoolInfo storage pool = pools[poolCount];
        pool.stakingToken = IERC20(_stakingToken);
        pool.rewardPerSecond = _rewardPerSecond;
        pool.lastRewardTime = block.timestamp;
        pool.flexibleAPR = _flexibleAPR;
        
        // Set locked staking APRs
        pool.lockedAPR[7] = 8;    // 7 days: 8% APR
        pool.lockedAPR[30] = 12;  // 30 days: 12% APR
        pool.lockedAPR[90] = 18;  // 90 days: 18% APR
        pool.lockedAPR[180] = 25; // 180 days: 25% APR
        
        poolCount++;
    }

    function stake(
        uint256 _poolId,
        uint256 _amount,
        uint256 _lockDays,
        bool _autoCompound
    ) external nonReentrant whenNotPaused {
        require(_poolId < poolCount, "Invalid pool");
        require(_amount > 0, "Amount must be greater than 0");
        
        PoolInfo storage pool = pools[_poolId];
        updatePool(_poolId);

        pool.stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 stakeId = stakeCount[msg.sender]++;
        StakeInfo storage stakeInfo = stakes[msg.sender][stakeId];
        
        stakeInfo.amount = _amount;
        stakeInfo.startTime = block.timestamp;
        stakeInfo.autoCompound = _autoCompound;
        
        if (_lockDays == 0) {
            stakeInfo.isFlexible = true;
            stakeInfo.lockEndTime = 0;
        } else {
            require(
                pool.lockedAPR[_lockDays] > 0,
                "Invalid lock period"
            );
            stakeInfo.isFlexible = false;
            stakeInfo.lockEndTime = block.timestamp + (_lockDays * 1 days);
        }
        
        stakeInfo.rewardDebt = (_amount * pool.accRewardPerShare) / PRECISION;
        pool.totalStaked += _amount;

        emit Staked(msg.sender, _poolId, stakeId, _amount, _lockDays, stakeInfo.isFlexible);
    }

    function unstake(uint256 _poolId, uint256 _stakeId) external nonReentrant {
        require(_poolId < poolCount, "Invalid pool");
        StakeInfo storage stakeInfo = stakes[msg.sender][_stakeId];
        require(stakeInfo.amount > 0, "No stake found");
        
        if (!stakeInfo.isFlexible) {
            require(block.timestamp >= stakeInfo.lockEndTime, "Stake is still locked");
        }

        PoolInfo storage pool = pools[_poolId];
        updatePool(_poolId);

        uint256 pending = ((stakeInfo.amount * pool.accRewardPerShare) / PRECISION) - stakeInfo.rewardDebt;
        
        if (pending > 0) {
            safeRewardTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, _poolId, pending);
        }

        uint256 amount = stakeInfo.amount;
        pool.totalStaked -= amount;
        stakeInfo.amount = 0;
        
        pool.stakingToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, _poolId, _stakeId, amount);
    }

    function claimRewards(uint256 _poolId, uint256 _stakeId) external nonReentrant {
        require(_poolId < poolCount, "Invalid pool");
        StakeInfo storage stakeInfo = stakes[msg.sender][_stakeId];
        require(stakeInfo.amount > 0, "No stake found");

        PoolInfo storage pool = pools[_poolId];
        updatePool(_poolId);

        uint256 pending = ((stakeInfo.amount * pool.accRewardPerShare) / PRECISION) - stakeInfo.rewardDebt;
        require(pending > 0, "No rewards to claim");

        stakeInfo.rewardDebt = (stakeInfo.amount * pool.accRewardPerShare) / PRECISION;

        if (stakeInfo.autoCompound) {
            // Compound rewards back into stake
            stakeInfo.amount += pending;
            pool.totalStaked += pending;
        } else {
            safeRewardTransfer(msg.sender, pending);
        }

        emit RewardClaimed(msg.sender, _poolId, pending);
    }

    function emergencyWithdraw(uint256 _poolId, uint256 _stakeId) external nonReentrant {
        require(_poolId < poolCount, "Invalid pool");
        StakeInfo storage stakeInfo = stakes[msg.sender][_stakeId];
        require(stakeInfo.amount > 0, "No stake found");

        PoolInfo storage pool = pools[_poolId];
        uint256 amount = stakeInfo.amount;
        uint256 penalty = 0;

        // Apply penalty if still locked
        if (!stakeInfo.isFlexible && block.timestamp < stakeInfo.lockEndTime) {
            penalty = (amount * emergencyWithdrawPenalty) / 100;
            amount -= penalty;
        }

        pool.totalStaked -= stakeInfo.amount;
        stakeInfo.amount = 0;
        stakeInfo.rewardDebt = 0;

        pool.stakingToken.safeTransfer(msg.sender, amount);
        
        if (penalty > 0) {
            pool.stakingToken.safeTransfer(owner(), penalty);
        }

        emit EmergencyWithdraw(msg.sender, _poolId, amount, penalty);
    }

    function updatePool(uint256 _poolId) internal {
        PoolInfo storage pool = pools[_poolId];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = timeElapsed * pool.rewardPerSecond;
        pool.accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        pool.lastRewardTime = block.timestamp;
    }

    function pendingReward(address _user, uint256 _poolId, uint256 _stakeId) external view returns (uint256) {
        PoolInfo storage pool = pools[_poolId];
        StakeInfo storage stakeInfo = stakes[_user][_stakeId];

        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalStaked != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = timeElapsed * pool.rewardPerSecond;
            accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        }

        return ((stakeInfo.amount * accRewardPerShare) / PRECISION) - stakeInfo.rewardDebt;
    }

    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.safeTransfer(_to, rewardBal);
        } else {
            rewardToken.safeTransfer(_to, _amount);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setEmergencyWithdrawPenalty(uint256 _penalty) external onlyOwner {
        require(_penalty <= 20, "Penalty too high");
        emergencyWithdrawPenalty = _penalty;
    }

    function getStakeInfo(address _user, uint256 _stakeId) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lockEndTime,
        bool isFlexible,
        bool autoCompound
    ) {
        StakeInfo storage stakeInfo = stakes[_user][_stakeId];
        return (
            stakeInfo.amount,
            stakeInfo.startTime,
            stakeInfo.lockEndTime,
            stakeInfo.isFlexible,
            stakeInfo.autoCompound
        );
    }
}
