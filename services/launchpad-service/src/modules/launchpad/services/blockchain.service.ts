import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
    const privateKey = this.configService.get<string>('ADMIN_PRIVATE_KEY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  async deploySaleContract(
    _tokenAddress: string,
    _tokenPrice: string,
    _hardCap: string,
    _saleStartTime: number,
    _saleEndTime: number,
  ): Promise<string> {
    try {
      // This is a placeholder - you would deploy your actual sale contract here
      // Example sale contract ABI and bytecode would be needed
      
      this.logger.log('Deploying sale contract...');

      // For now, return a mock address
      // In production, you would:
      // 1. Load contract ABI and bytecode
      // 2. Create contract factory
      // 3. Deploy contract with parameters
      // 4. Wait for deployment
      // 5. Return contract address

      const mockAddress = ethers.Wallet.createRandom().address;
      
      this.logger.log(`Sale contract deployed at: ${mockAddress}`);
      
      return mockAddress;
    } catch (error) {
      this.logger.error('Failed to deploy sale contract', error);
      throw error;
    }
  }

  async deployVestingContract(
    _tokenAddress: string,
    _beneficiary: string,
    _vestingSchedule: any[],
  ): Promise<string> {
    try {
      this.logger.log('Deploying vesting contract...');

      // Placeholder for vesting contract deployment
      const mockAddress = ethers.Wallet.createRandom().address;
      
      this.logger.log(`Vesting contract deployed at: ${mockAddress}`);
      
      return mockAddress;
    } catch (error) {
      this.logger.error('Failed to deploy vesting contract', error);
      throw error;
    }
  }

  async transferTokens(
    tokenAddress: string,
    to: string,
    amount: string,
  ): Promise<string> {
    try {
      // ERC20 ABI for transfer function
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
      ];

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);

      this.logger.log(`Transferring ${amount} tokens to ${to}`);

      const tx = await tokenContract.transfer(to, amount);
      const receipt = await tx.wait();

      this.logger.log(`Transfer successful. TX: ${receipt.hash}`);

      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to transfer tokens', error);
      throw error;
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
      ];

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const balance = await tokenContract.balanceOf(walletAddress);

      return balance.toString();
    } catch (error) {
      this.logger.error('Failed to get token balance', error);
      throw error;
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      this.logger.error('Failed to verify transaction', error);
      return false;
    }
  }

  async executeVesting(
    vestingContractAddress: string,
    beneficiary: string,
    amount: string,
  ): Promise<string> {
    try {
      // Placeholder for vesting execution
      // In production, call the vesting contract's release function

      const vestingAbi = [
        'function release(address beneficiary, uint256 amount) returns (bool)',
      ];

      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        vestingAbi,
        this.wallet,
      );

      this.logger.log(`Executing vesting for ${beneficiary}: ${amount}`);

      const tx = await vestingContract.release(beneficiary, amount);
      const receipt = await tx.wait();

      this.logger.log(`Vesting executed. TX: ${receipt.hash}`);

      return receipt.hash;
    } catch (error) {
      this.logger.error('Failed to execute vesting', error);
      throw error;
    }
  }

  async getCurrentBlock(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async estimateGas(
    to: string,
    data: string,
    value?: string,
  ): Promise<string> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        to,
        data,
        value: value ? ethers.parseEther(value) : undefined,
      });

      return gasEstimate.toString();
    } catch (error) {
      this.logger.error('Failed to estimate gas', error);
      throw error;
    }
  }

  async getGasPrice(): Promise<string> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice?.toString() || '0';
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  generateWallet(): { address: string; privateKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }
}
