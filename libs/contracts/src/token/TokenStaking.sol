// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenStaking
 * @dev Staking contract with tiered lock periods and APY
 */
contract TokenStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct StakingTier {
        uint256 lockDuration; // in seconds
        uint256 apyBasisPoints; // APY in basis points (100 = 1%)
        bool active;
    }

    struct StakePosition {
        uint256 amount;
        uint256 tierId;
        uint256 startTime;
        uint256 endTime;
        uint256 rewardsClaimed;
        bool withdrawn;
    }

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    mapping(uint256 => StakingTier) public stakingTiers;
    mapping(address => StakePosition[]) public userStakes;
    mapping(address => uint256) public totalStaked;

    uint256 public nextTierId;
    uint256 public totalStakedAmount;
    uint256 public totalRewardsDistributed;
    uint256 public minimumStakeAmount;
    uint256 public emergencyWithdrawPenalty; // basis points

    event TierAdded(uint256 indexed tierId, uint256 lockDuration, uint256 apy);
    event TierUpdated(uint256 indexed tierId, uint256 apy, bool active);
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 tierId
    );
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event RewardsClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount
    );
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 penalty
    );

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _minimumStakeAmount
    ) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        minimumStakeAmount = _minimumStakeAmount;
        emergencyWithdrawPenalty = 1000; // 10% default penalty

        // Initialize default tiers
        _addTier(30 days, 500); // 30 days - 5% APY
        _addTier(90 days, 1000); // 90 days - 10% APY
        _addTier(180 days, 1500); // 180 days - 15% APY
        _addTier(365 days, 2500); // 365 days - 25% APY
    }

    /**
     * @dev Add new staking tier
     */
    function addTier(uint256 lockDuration, uint256 apyBasisPoints) 
        external 
        onlyOwner 
    {
        _addTier(lockDuration, apyBasisPoints);
    }

    function _addTier(uint256 lockDuration, uint256 apyBasisPoints) private {
        require(lockDuration > 0, "Lock duration must be > 0");
        require(apyBasisPoints <= 10000, "APY too high"); // Max 100%

        stakingTiers[nextTierId] = StakingTier({
            lockDuration: lockDuration,
            apyBasisPoints: apyBasisPoints,
            active: true
        });

        emit TierAdded(nextTierId, lockDuration, apyBasisPoints);
        nextTierId++;
    }

    /**
     * @dev Update tier APY or status
     */
    function updateTier(uint256 tierId, uint256 apyBasisPoints, bool active) 
        external 
        onlyOwner 
    {
        require(tierId < nextTierId, "Invalid tier");
        require(apyBasisPoints <= 10000, "APY too high");

        stakingTiers[tierId].apyBasisPoints = apyBasisPoints;
        stakingTiers[tierId].active = active;

        emit TierUpdated(tierId, apyBasisPoints, active);
    }

    /**
     * @dev Stake tokens
     */
    function stake(uint256 amount, uint256 tierId) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount >= minimumStakeAmount, "Amount below minimum");
        require(tierId < nextTierId, "Invalid tier");
        require(stakingTiers[tierId].active, "Tier not active");

        StakingTier storage tier = stakingTiers[tierId];
        uint256 endTime = block.timestamp + tier.lockDuration;

        userStakes[msg.sender].push(StakePosition({
            amount: amount,
            tierId: tierId,
            startTime: block.timestamp,
            endTime: endTime,
            rewardsClaimed: 0,
            withdrawn: false
        }));

        totalStaked[msg.sender] += amount;
        totalStakedAmount += amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(
            msg.sender,
            userStakes[msg.sender].length - 1,
            amount,
            tierId
        );
    }

    /**
     * @dev Unstake tokens after lock period
     */
    function unstake(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake ID");
        StakePosition storage position = userStakes[msg.sender][stakeId];
        
        require(!position.withdrawn, "Already withdrawn");
        require(block.timestamp >= position.endTime, "Lock period not ended");

        uint256 rewards = _calculateRewards(position);
        
        position.withdrawn = true;
        totalStaked[msg.sender] -= position.amount;
        totalStakedAmount -= position.amount;

        // Transfer staked tokens
        stakingToken.safeTransfer(msg.sender, position.amount);

        // Transfer rewards
        if (rewards > 0) {
            position.rewardsClaimed += rewards;
            totalRewardsDistributed += rewards;
            rewardToken.safeTransfer(msg.sender, rewards);
            emit RewardsClaimed(msg.sender, stakeId, rewards);
        }

        emit Unstaked(msg.sender, stakeId, position.amount);
    }

    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake ID");
        StakePosition storage position = userStakes[msg.sender][stakeId];
        
        require(!position.withdrawn, "Already withdrawn");

        uint256 rewards = _calculateRewards(position);
        require(rewards > 0, "No rewards available");

        position.rewardsClaimed += rewards;
        totalRewardsDistributed += rewards;

        rewardToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, stakeId, rewards);
    }

    /**
     * @dev Emergency withdraw with penalty
     */
    function emergencyWithdraw(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake ID");
        StakePosition storage position = userStakes[msg.sender][stakeId];
        
        require(!position.withdrawn, "Already withdrawn");

        uint256 penalty = (position.amount * emergencyWithdrawPenalty) / 10000;
        uint256 amountAfterPenalty = position.amount - penalty;

        position.withdrawn = true;
        totalStaked[msg.sender] -= position.amount;
        totalStakedAmount -= position.amount;

        stakingToken.safeTransfer(msg.sender, amountAfterPenalty);
        // Penalty stays in contract as additional rewards pool

        emit EmergencyWithdraw(msg.sender, stakeId, amountAfterPenalty, penalty);
    }

    /**
     * @dev Calculate pending rewards for a stake
     */
    function calculatePendingRewards(address user, uint256 stakeId) 
        external 
        view 
        returns (uint256) 
    {
        require(stakeId < userStakes[user].length, "Invalid stake ID");
        StakePosition storage position = userStakes[user][stakeId];
        
        if (position.withdrawn) {
            return 0;
        }

        return _calculateRewards(position);
    }

    /**
     * @dev Get user's all stakes
     */
    function getUserStakes(address user) 
        external 
        view 
        returns (StakePosition[] memory) 
    {
        return userStakes[user];
    }

    /**
     * @dev Internal reward calculation
     */
    function _calculateRewards(StakePosition storage position) 
        private 
        view 
        returns (uint256) 
    {
        StakingTier storage tier = stakingTiers[position.tierId];
        
        uint256 stakingDuration = block.timestamp > position.endTime
            ? position.endTime - position.startTime
            : block.timestamp - position.startTime;

        uint256 rewards = (position.amount * tier.apyBasisPoints * stakingDuration) /
            (365 days * 10000);

        return rewards - position.rewardsClaimed;
    }

    /**
     * @dev Update minimum stake amount
     */
    function setMinimumStakeAmount(uint256 amount) external onlyOwner {
        minimumStakeAmount = amount;
    }

    /**
     * @dev Update emergency withdraw penalty
     */
    function setEmergencyWithdrawPenalty(uint256 penaltyBasisPoints) 
        external 
        onlyOwner 
    {
        require(penaltyBasisPoints <= 5000, "Penalty too high"); // Max 50%
        emergencyWithdrawPenalty = penaltyBasisPoints;
    }

    /**
     * @dev Pause staking
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Deposit reward tokens
     */
    function depositRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Emergency withdraw rewards (owner only)
     */
    function emergencyWithdrawRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransfer(owner(), amount);
    }
}
