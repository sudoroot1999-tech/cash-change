import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private provider: ethers.Provider;
  private tokenContract: ethers.Contract;
  private stakingContract: ethers.Contract;
  private vestingContract: ethers.Contract;
  private distributionContract: ethers.Contract;

  // Contract ABIs (simplified - use full ABIs in production)
  private readonly TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function circulatingSupply() view returns (uint256)',
    'function totalBurned() view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function burn(uint256 amount)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event TokensBurned(address indexed burner, uint256 amount)',
  ];

  private readonly STAKING_ABI = [
    'function stake(uint256 amount, uint256 tierId)',
    'function unstake(uint256 stakeId)',
    'function claimRewards(uint256 stakeId)',
    'function calculatePendingRewards(address user, uint256 stakeId) view returns (uint256)',
    'function getUserStakes(address user) view returns (tuple[])',
    'event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 tierId)',
    'event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount)',
  ];

  private readonly VESTING_ABI = [
    'function createVestingSchedule(address beneficiary, uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, bool revocable) returns (bytes32)',
    'function release(bytes32 scheduleId)',
    'function getVestedAmount(bytes32 scheduleId) view returns (uint256)',
    'function getReleasableAmount(bytes32 scheduleId) view returns (uint256)',
    'event VestingScheduleCreated(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount, uint256 startTime)',
    'event TokensReleased(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount)',
  ];

  constructor(private configService: ConfigService) {
    this.initializeContracts();
  }

  private initializeContracts() {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
    const privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY');
    
    if (!rpcUrl || !privateKey) {
      console.warn('Blockchain configuration not found. Running in mock mode.');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, this.provider);

    const tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS');
    const stakingAddress = this.configService.get<string>('STAKING_CONTRACT_ADDRESS');
    const vestingAddress = this.configService.get<string>('VESTING_CONTRACT_ADDRESS');
    const distributionAddress = this.configService.get<string>('DISTRIBUTION_CONTRACT_ADDRESS');

    if (tokenAddress) {
      this.tokenContract = new ethers.Contract(tokenAddress, this.TOKEN_ABI, wallet);
    }
    if (stakingAddress) {
      this.stakingContract = new ethers.Contract(stakingAddress, this.STAKING_ABI, wallet);
    }
    if (vestingAddress) {
      this.vestingContract = new ethers.Contract(vestingAddress, this.VESTING_ABI, wallet);
    }
    if (distributionAddress) {
      this.distributionContract = new ethers.Contract(distributionAddress, [], wallet);
    }
  }

  async getTokenBalance(address: string): Promise<string> {
    if (!this.tokenContract) {
      return '0';
    }

    const balance = await this.tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async getTotalSupply(): Promise<string> {
    if (!this.tokenContract) {
      return '1000000000';
    }

    const supply = await this.tokenContract.totalSupply();
    return ethers.formatEther(supply);
  }

  async getCirculatingSupply(): Promise<string> {
    if (!this.tokenContract) {
      return '1000000000';
    }

    const supply = await this.tokenContract.circulatingSupply();
    return ethers.formatEther(supply);
  }

  async getTotalBurned(): Promise<string> {
    if (!this.tokenContract) {
      return '0';
    }

    const burned = await this.tokenContract.totalBurned();
    return ethers.formatEther(burned);
  }

  async stakeTokens(walletAddress: string, amount: string, tierId: number) {
    if (!this.stakingContract) {
      // Mock response for testing
      return {
        stakeId: Math.floor(Math.random() * 1000000),
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
        contractAddress: this.configService.get<string>('STAKING_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000',
      };
    }

    const amountWei = ethers.parseEther(amount);
    const tx = await this.stakingContract.stake(amountWei, tierId);
    const receipt = await tx.wait();

    // Parse stakeId from event logs
    const stakeEvent = receipt.logs.find((log: any) => 
      log.topics[0] === ethers.id('Staked(address,uint256,uint256,uint256)')
    );

    let stakeId = 0;
    if (stakeEvent) {
      stakeId = parseInt(stakeEvent.topics[2], 16);
    }

    return {
      stakeId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await this.stakingContract.getAddress(),
    };
  }

  async unstakeTokens(walletAddress: string, stakeId: number) {
    if (!this.stakingContract) {
      return {
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
        contractAddress: this.configService.get<string>('STAKING_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000',
      };
    }

    const tx = await this.stakingContract.unstake(stakeId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await this.stakingContract.getAddress(),
    };
  }

  async claimStakingRewards(walletAddress: string, stakeId: number) {
    if (!this.stakingContract) {
      return {
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
        contractAddress: this.configService.get<string>('STAKING_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000',
      };
    }

    const tx = await this.stakingContract.claimRewards(stakeId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await this.stakingContract.getAddress(),
    };
  }

  async createVestingSchedule(
    beneficiary: string,
    totalAmount: string,
    startTime: Date,
    cliffDuration: number,
    vestingDuration: number,
  ) {
    if (!this.vestingContract) {
      return {
        scheduleId: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
      };
    }

    const amountWei = ethers.parseEther(totalAmount);
    const startTimestamp = Math.floor(startTime.getTime() / 1000);

    const tx = await this.vestingContract.createVestingSchedule(
      beneficiary,
      amountWei,
      startTimestamp,
      cliffDuration,
      vestingDuration,
      true, // revocable
    );
    const receipt = await tx.wait();

    // Parse scheduleId from event logs
    const scheduleEvent = receipt.logs.find((log: any) =>
      log.topics[0] === ethers.id('VestingScheduleCreated(bytes32,address,uint256,uint256)')
    );

    let scheduleId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (scheduleEvent) {
      scheduleId = scheduleEvent.topics[1];
    }

    return {
      scheduleId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async releaseVestedTokens(walletAddress: string, scheduleId: string) {
    if (!this.vestingContract) {
      return {
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
        contractAddress: this.configService.get<string>('VESTING_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000',
      };
    }

    const tx = await this.vestingContract.release(scheduleId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await this.vestingContract.getAddress(),
    };
  }

  async transferTokens(from: string, to: string, amount: string) {
    if (!this.tokenContract) {
      return {
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
      };
    }

    const amountWei = ethers.parseEther(amount);
    const tx = await this.tokenContract.transfer(to, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async burnTokens(amount: string) {
    if (!this.tokenContract) {
      return {
        txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockNumber: Math.floor(Math.random() * 1000000),
      };
    }

    const amountWei = ethers.parseEther(amount);
    const tx = await this.tokenContract.burn(amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      return Date.now();
    }

    return await this.provider.getBlockNumber();
  }

  async getGasPrice(): Promise<string> {
    if (!this.provider) {
      return '0';
    }

    const feeData = await this.provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || 0n, 'gwei');
  }
}
