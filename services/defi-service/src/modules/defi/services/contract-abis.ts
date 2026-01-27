export const STAKING_CONTRACT_ABI = [
  'function stake(uint256 poolId, uint256 amount, uint256 lockDays, bool autoCompound) external',
  'function unstake(uint256 poolId, uint256 stakeId) external',
  'function claimRewards(uint256 poolId, uint256 stakeId) external',
  'function emergencyWithdraw(uint256 poolId, uint256 stakeId) external',
  'function pendingReward(address user, uint256 poolId, uint256 stakeId) external view returns (uint256)',
  'function getStakeInfo(address user, uint256 stakeId) external view returns (uint256 amount, uint256 startTime, uint256 lockEndTime, bool isFlexible, bool autoCompound)',
  'function pause() external',
  'function unpause() external',
  'event Staked(address indexed user, uint256 indexed poolId, uint256 indexed stakeId, uint256 amount, uint256 lockDays, bool isFlexible)',
  'event Unstaked(address indexed user, uint256 indexed poolId, uint256 indexed stakeId, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount)',
];

export const LENDING_CONTRACT_ABI = [
  'function borrow(address collateralToken, uint256 collateralAmount, address borrowToken, uint256 borrowAmount) external returns (uint256)',
  'function borrowWithNFTCollateral(address nftContract, uint256 nftTokenId, address borrowToken, uint256 borrowAmount) external returns (uint256)',
  'function repay(uint256 loanId, uint256 amount) external',
  'function liquidate(uint256 loanId) external',
  'function calculateHealthFactor(uint256 loanId) external view returns (uint256)',
  'function getLoanInfo(uint256 loanId) external view returns (address borrower, address collateralToken, uint256 collateralAmount, address borrowToken, uint256 borrowAmount, uint256 accruedInterest, uint256 healthFactor, bool active)',
  'function calculateInterestRate(address token) external view returns (uint256)',
  'function pause() external',
  'function unpause() external',
  'event LoanCreated(uint256 indexed loanId, address indexed borrower, address collateralToken, uint256 collateralAmount, address borrowToken, uint256 borrowAmount)',
  'event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest)',
  'event LoanLiquidated(uint256 indexed loanId, address indexed liquidator, uint256 collateralSeized)',
];

export const LIQUIDITY_POOL_FACTORY_ABI = [
  'function createPool(address token0, address token1, uint256 rewardRate, uint256 feePercentage) external returns (bytes32)',
  'function addLiquidity(bytes32 poolId, uint256 amount0, uint256 amount1, uint256 minLiquidity) external returns (uint256 liquidity)',
  'function removeLiquidity(bytes32 poolId, uint256 liquidity, uint256 minAmount0, uint256 minAmount1) external returns (uint256 amount0, uint256 amount1)',
  'function swap(bytes32 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)',
  'function harvestRewards(bytes32 poolId) external',
  'function calculateImpermanentLoss(bytes32 poolId, address user) external view returns (int256)',
  'function pendingReward(bytes32 poolId, address user) external view returns (uint256)',
  'function getPoolInfo(bytes32 poolId) external view returns (address token0, address token1, uint256 reserve0, uint256 reserve1, uint256 totalLiquidity, uint256 rewardRate)',
  'function getUserPosition(bytes32 poolId, address user) external view returns (uint256 lpAmount, uint256 token0Deposited, uint256 token1Deposited, uint256 pendingRewards)',
  'function getAllPools() external view returns (bytes32[] memory)',
  'function getUserPools(address user) external view returns (bytes32[] memory)',
  'event PoolCreated(bytes32 indexed poolId, address token0, address token1, address lpToken)',
  'event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity)',
  'event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity)',
  'event RewardsClaimed(bytes32 indexed poolId, address indexed user, uint256 amount)',
];

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function approve(address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function balanceOf(address owner) view returns (uint256)',
];

// External DeFi Protocol ABIs (simplified)
export const AAVE_LENDING_POOL_ABI = [
  'function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
  'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
  'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

export const UNISWAP_V2_ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)',
];

export const COMPOUND_COMPTROLLER_ABI = [
  'function enterMarkets(address[] calldata cTokens) external returns (uint[] memory)',
  'function exitMarket(address cToken) external returns (uint)',
  'function getAccountLiquidity(address account) external view returns (uint, uint, uint)',
  'function claimComp(address holder) external',
];
