// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTStaking is ReentrancyGuard, Ownable {
    struct StakingPool {
        address nftContract;
        address rewardToken;
        uint256 rewardsPerDay;
        uint256 minStakingPeriod;
        uint256 totalStaked;
        bool isActive;
    }
    
    struct StakeInfo {
        uint256 poolId;
        uint256 tokenId;
        uint256 stakedAt;
        uint256 lastClaimAt;
        uint256 rewardsEarned;
        uint256 rewardsClaimed;
    }
    
    uint256 private _poolIdCounter;
    mapping(uint256 => StakingPool) public pools;
    mapping(address => mapping(uint256 => StakeInfo)) public stakes; // user => tokenId => StakeInfo
    mapping(uint256 => uint256[]) public poolStakedTokens;
    mapping(address => uint256[]) public userStakedTokens;
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed nftContract,
        address rewardToken,
        uint256 rewardsPerDay
    );
    
    event NFTStaked(
        uint256 indexed poolId,
        address indexed staker,
        uint256 indexed tokenId
    );
    
    event NFTUnstaked(
        uint256 indexed poolId,
        address indexed staker,
        uint256 indexed tokenId
    );
    
    event RewardsClaimed(
        address indexed staker,
        uint256 indexed tokenId,
        uint256 amount
    );
    
    constructor() Ownable(msg.sender) {}
    
    function createPool(
        address nftContract,
        address rewardToken,
        uint256 rewardsPerDay,
        uint256 minStakingPeriod
    ) external onlyOwner returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(rewardToken != address(0), "Invalid reward token");
        require(rewardsPerDay > 0, "Invalid rewards");
        
        uint256 poolId = _poolIdCounter++;
        
        pools[poolId] = StakingPool({
            nftContract: nftContract,
            rewardToken: rewardToken,
            rewardsPerDay: rewardsPerDay,
            minStakingPeriod: minStakingPeriod,
            totalStaked: 0,
            isActive: true
        });
        
        emit PoolCreated(poolId, nftContract, rewardToken, rewardsPerDay);
        return poolId;
    }
    
    function stakeNFT(uint256 poolId, uint256 tokenId) external nonReentrant {
        StakingPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(IERC721(pool.nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(stakes[msg.sender][tokenId].stakedAt == 0, "Already staked");
        
        IERC721(pool.nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        stakes[msg.sender][tokenId] = StakeInfo({
            poolId: poolId,
            tokenId: tokenId,
            stakedAt: block.timestamp,
            lastClaimAt: block.timestamp,
            rewardsEarned: 0,
            rewardsClaimed: 0
        });
        
        pool.totalStaked++;
        poolStakedTokens[poolId].push(tokenId);
        userStakedTokens[msg.sender].push(tokenId);
        
        emit NFTStaked(poolId, msg.sender, tokenId);
    }
    
    function unstakeNFT(uint256 tokenId) external nonReentrant {
        StakeInfo storage stake = stakes[msg.sender][tokenId];
        require(stake.stakedAt > 0, "Not staked");
        
        StakingPool storage pool = pools[stake.poolId];
        require(
            block.timestamp >= stake.stakedAt + pool.minStakingPeriod,
            "Min staking period not met"
        );
        
        // Claim pending rewards
        _claimRewards(msg.sender, tokenId);
        
        // Transfer NFT back
        IERC721(pool.nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        pool.totalStaked--;
        
        // Remove from arrays
        _removeTokenFromUserStakes(msg.sender, tokenId);
        _removeTokenFromPoolStakes(stake.poolId, tokenId);
        
        emit NFTUnstaked(stake.poolId, msg.sender, tokenId);
        
        delete stakes[msg.sender][tokenId];
    }
    
    function claimRewards(uint256 tokenId) external nonReentrant {
        _claimRewards(msg.sender, tokenId);
    }
    
    function _claimRewards(address staker, uint256 tokenId) internal {
        StakeInfo storage stake = stakes[staker][tokenId];
        require(stake.stakedAt > 0, "Not staked");
        
        uint256 pending = calculatePendingRewards(staker, tokenId);
        if (pending > 0) {
            StakingPool memory pool = pools[stake.poolId];
            
            stake.rewardsEarned += pending;
            stake.rewardsClaimed += pending;
            stake.lastClaimAt = block.timestamp;
            
            require(
                IERC20(pool.rewardToken).transfer(staker, pending),
                "Reward transfer failed"
            );
            
            emit RewardsClaimed(staker, tokenId, pending);
        }
    }
    
    function calculatePendingRewards(address staker, uint256 tokenId) public view returns (uint256) {
        StakeInfo memory stake = stakes[staker][tokenId];
        if (stake.stakedAt == 0) return 0;
        
        StakingPool memory pool = pools[stake.poolId];
        
        uint256 timeStaked = block.timestamp - stake.lastClaimAt;
        uint256 rewardsPerSecond = pool.rewardsPerDay / 1 days;
        
        return timeStaked * rewardsPerSecond;
    }
    
    function getUserStakedTokens(address user) external view returns (uint256[] memory) {
        return userStakedTokens[user];
    }
    
    function getPoolStakedTokens(uint256 poolId) external view returns (uint256[] memory) {
        return poolStakedTokens[poolId];
    }
    
    function updatePoolRewards(uint256 poolId, uint256 newRewardsPerDay) external onlyOwner {
        require(pools[poolId].nftContract != address(0), "Pool does not exist");
        pools[poolId].rewardsPerDay = newRewardsPerDay;
    }
    
    function setPoolActive(uint256 poolId, bool active) external onlyOwner {
        require(pools[poolId].nftContract != address(0), "Pool does not exist");
        pools[poolId].isActive = active;
    }
    
    function depositRewardTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
    
    function _removeTokenFromUserStakes(address user, uint256 tokenId) internal {
        uint256[] storage tokens = userStakedTokens[user];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
    
    function _removeTokenFromPoolStakes(uint256 poolId, uint256 tokenId) internal {
        uint256[] storage tokens = poolStakedTokens[poolId];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
}
