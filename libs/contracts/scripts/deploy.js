const hre = require("hardhat");

async function main() {
  console.log("Starting EXT Token deployment...");

  // Load configuration
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
  const privateKey = process.env.ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('ADMIN_PRIVATE_KEY not set in environment');
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying from address:', wallet.address);
  console.log('Network:', await provider.getNetwork());

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy EXT Token
  console.log("\n1. Deploying EXT Token...");
  const EXTToken = await hre.ethers.getContractFactory("EXTToken");
  const token = await EXTToken.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("EXT Token deployed to:", tokenAddress);

  // Deploy TokenSale contract
  console.log('📝 Deploying TokenSale contract...');

  // Example parameters - adjust as needed
  // const tokenAddress = process.env.SALE_TOKEN_ADDRESS || ethers.ZeroAddress;
  const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS || ethers.ZeroAddress;
  const tokenPrice = ethers.parseUnits('0.1', 18); // 0.1 USDT per token
  const hardCap = ethers.parseUnits('1000000', 18); // 1M USDT
  const softCap = ethers.parseUnits('100000', 18); // 100K USDT
  const minAllocation = ethers.parseUnits('100', 18); // 100 USDT
  const maxAllocation = ethers.parseUnits('10000', 18); // 10K USDT
  const saleStartTime = Math.floor(Date.now() / 1000) + 86400; // Start in 24h
  const saleEndTime = saleStartTime + 7 * 86400; // 7 days sale

  // Note: In production, load compiled contract artifacts
  // For now, this is a placeholder showing the deployment pattern

  console.log('TokenSale Parameters:');
  console.log('- Token:', tokenAddress);
  console.log('- Payment Token:', paymentTokenAddress);
  console.log('- Token Price:', ethers.formatUnits(tokenPrice, 18));
  console.log('- Hard Cap:', ethers.formatUnits(hardCap, 18));
  console.log('- Soft Cap:', ethers.formatUnits(softCap, 18));
  console.log('- Sale Start:', new Date(saleStartTime * 1000).toISOString());
  console.log('- Sale End:', new Date(saleEndTime * 1000).toISOString());


  const TokenSale = await ethers.getContractFactory('TokenSale', wallet);
  const tokenSale = await TokenSale.deploy(
    tokenAddress,
    paymentTokenAddress,
    tokenPrice,
    hardCap,
    softCap,
    minAllocation,
    maxAllocation,
    saleStartTime,
    saleEndTime
  );
  await tokenSale.waitForDeployment();
  const tokenSaleAddress = await tokenSale.getAddress();
  console.log('✅ TokenSale deployed at:', tokenSaleAddress);

  // Deploy VestingContract
  console.log('\n📝 Deploying VestingContract...');

  const VestingContract = await ethers.getContractFactory('VestingContract', wallet);
  const vestingContract = await VestingContract.deploy(tokenAddress);
  await vestingContract.waitForDeployment();
  const vestingContractAddress = await vestingContract.getAddress();
  console.log('✅ VestingContract deployed at:', vestingContractAddress);

  // Deploy Token Vesting
  console.log("\n2. Deploying Token Vesting...");
  const TokenVesting = await hre.ethers.getContractFactory("TokenVesting");
  const vesting = await TokenVesting.deploy(tokenAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("Token Vesting deployed to:", vestingAddress);

  // Deploy Token Staking
  console.log("\n3. Deploying Token Staking...");
  const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
  const minimumStake = hre.ethers.parseEther("100"); // 100 tokens minimum
  const staking = await TokenStaking.deploy(
    tokenAddress,
    tokenAddress, // Using same token for rewards
    minimumStake
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("Token Staking deployed to:", stakingAddress);

  // Deploy Token Distribution
  console.log("\n4. Deploying Token Distribution...");
  const TokenDistribution = await hre.ethers.getContractFactory("TokenDistribution");
  const distribution = await TokenDistribution.deploy(tokenAddress);
  await distribution.waitForDeployment();
  const distributionAddress = await distribution.getAddress();
  console.log("Token Distribution deployed to:", distributionAddress);

  // Initialize Distribution
  console.log("\n5. Initializing Token Distribution...");
  const initTx = await distribution.initializeDistribution();
  await initTx.wait();
  console.log("Distribution initialized");

  // Transfer tokens to distribution contract
  console.log("\n6. Transferring tokens to distribution contract...");
  const totalSupply = await token.TOTAL_SUPPLY();
  const transferTx = await token.transfer(distributionAddress, totalSupply);
  await transferTx.wait();
  console.log("Tokens transferred to distribution contract");

  // Set vesting contract for Team & Advisors
  console.log("\n7. Setting vesting contract for Team & Advisors...");
  const setVestingTx = await distribution.setVestingContract(2, vestingAddress); // 2 = TeamAdvisors
  await setVestingTx.wait();
  console.log("Vesting contract set");

  // Transfer reward tokens to staking contract
  console.log("\n8. Preparing staking rewards...");
  const rewardAmount = hre.ethers.parseEther("50000000"); // 50M tokens for rewards
  // Note: In production, transfer from distribution or allocate separately
  console.log("Reward allocation prepared (to be done via distribution)");

  console.log("\n=== Deployment Summary ===");
  console.log("EXT Token:", tokenAddress);
  console.log("Token Vesting:", vestingAddress);
  console.log("Token Staking:", stakingAddress);
  console.log("Token Distribution:", distributionAddress);
  console.log("\nNetwork:", hre.network.name);
  console.log("Deployer:", deployer.address);

  // Deploy reward token (mock ERC20 for rewards)
  console.log("📝 Deploying Reward Token...");
  const RewardToken = await ethers.getContractFactory("MockERC20");
  const rewardToken = await RewardToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000000"));
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("✅ Reward Token deployed to:", rewardTokenAddress, "\n");

  // Deploy Staking Contract
  console.log("📝 Deploying Staking Contract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(rewardTokenAddress);
  await stakingContract.waitForDeployment();
  // const stakingAddress = await stakingContract.getAddress();
  console.log("✅ Staking Contract deployed to:", stakingAddress, "\n");

  // Deploy Price Oracle (mock for testing)
  console.log("📝 Deploying Mock Price Oracle...");
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ Price Oracle deployed to:", priceOracleAddress, "\n");

  // Deploy Lending Contract
  console.log("📝 Deploying Lending Contract...");
  const LendingContract = await ethers.getContractFactory("LendingContract");
  const lendingContract = await LendingContract.deploy(priceOracleAddress);
  await lendingContract.waitForDeployment();
  const lendingAddress = await lendingContract.getAddress();
  console.log("✅ Lending Contract deployed to:", lendingAddress, "\n");

  // Deploy Liquidity Pool Factory
  console.log("📝 Deploying Liquidity Pool Factory...");
  const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
  const lpFactory = await LiquidityPoolFactory.deploy(rewardTokenAddress);
  await lpFactory.waitForDeployment();
  const lpFactoryAddress = await lpFactory.getAddress();
  console.log("✅ Liquidity Pool Factory deployed to:", lpFactoryAddress, "\n");

  // Create initial staking pool
  console.log("📝 Creating initial staking pool...");
  const stakingTx = await stakingContract.createPool(
    rewardTokenAddress,
    ethers.parseEther("0.1"), // 0.1 tokens per second
    5 // 5% flexible APR
  );
  await stakingTx.wait();
  console.log("✅ Initial staking pool created\n");

  // Transfer some reward tokens to staking contract
  console.log("📝 Funding staking contract with reward tokens...");
  const fundTx = await rewardToken.transfer(stakingAddress, ethers.parseEther("10000000"));
  await fundTx.wait();
  console.log("✅ Staking contract funded\n");

  // Configure lending markets
  console.log("📝 Adding lending markets...");

  // Add BTC market
  await lendingContract.addMarket(
    rewardTokenAddress, // Using reward token as mock BTC
    500, // 5% base interest rate
    200, // 2% utilization multiplier
    7500, // 75% collateral factor
    8000, // 80% liquidation threshold
    1000 // 10% liquidation penalty
  );
  console.log("✅ BTC market added");

  // Add ETH market
  await lendingContract.addMarket(
    rewardTokenAddress, // Using reward token as mock ETH
    400,
    150,
    7500,
    8000,
    1000
  );
  console.log("✅ ETH market added\n");

  // Summary
  console.log("=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Reward Token:", rewardTokenAddress);
  console.log("Staking Contract:", stakingAddress);
  console.log("Lending Contract:", lendingAddress);
  console.log("LP Factory:", lpFactoryAddress);
  console.log("Price Oracle:", priceOracleAddress);
  console.log("=".repeat(60));
  console.log("\n✨ Deployment completed successfully!\n");

  console.log("📝 Update your .env file with these addresses:");
  console.log(`STAKING_CONTRACT_ADDRESS=${stakingAddress}`);
  console.log(`LENDING_CONTRACT_ADDRESS=${lendingAddress}`);
  console.log(`LP_FACTORY_CONTRACT_ADDRESS=${lpFactoryAddress}`);
  console.log(`PRICE_ORACLE_ADDRESS=${priceOracleAddress}`);
  console.log(`REWARD_TOKEN_ADDRESS=${rewardTokenAddress}\n`);

  // Verification commands
  console.log("🔍 To verify contracts on Etherscan:");
  console.log(`npx hardhat verify --network <network> ${rewardTokenAddress} "Reward Token" "RWD" "1000000000000000000000000000"`);
  console.log(`npx hardhat verify --network <network> ${stakingAddress} ${rewardTokenAddress}`);
  console.log(`npx hardhat verify --network <network> ${lendingAddress} ${priceOracleAddress}`);
  console.log(`npx hardhat verify --network <network> ${lpFactoryAddress} ${rewardTokenAddress}\n`);

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EXTToken: tokenAddress,
      TokenVesting: vestingAddress,
      TokenStaking: stakingAddress,
      TokenDistribution: distributionAddress,
    },
  };

  fs.writeFileSync(
    `./deployments/${hre.network.name}-deployment.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployments/${hre.network.name}-deployment.json`);

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== Verification Commands ===");
    console.log(`npx hardhat verify --network ${hre.network.name} ${tokenAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${vestingAddress} "${tokenAddress}"`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${stakingAddress} "${tokenAddress}" "${tokenAddress}" "${minimumStake}"`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${distributionAddress} "${tokenAddress}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
