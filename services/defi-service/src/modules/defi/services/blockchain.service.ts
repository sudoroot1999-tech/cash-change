import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('ETH_RPC_URL', '');
    const privateKey = this.configService.get<string>('ADMIN_PRIVATE_KEY', '');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async getContract(address: string, abi: any): Promise<ethers.Contract> {
    return new ethers.Contract(address, abi, this.wallet);
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, abi, this.provider);
    const balance = await contract.balanceOf(userAddress);
    return ethers.formatEther(balance);
  }

  async sendTransaction(
    to: string,
    data: string,
    value?: string,
  ): Promise<ethers.TransactionResponse> {
    const tx = {
      to,
      data,
      value: value ? ethers.parseEther(value) : 0,
    };

    return await this.wallet.sendTransaction(tx);
  }

  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt> {
    const receipt = await this.provider.waitForTransaction(txHash);
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }
    return receipt;
  }

  async estimateGas(to: string, data: string): Promise<bigint> {
    return await this.provider.estimateGas({ to, data });
  }

  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    if (!feeData.gasPrice) {
      throw new Error('Gas price not available');
    }
    return feeData.gasPrice;
  }

  parseEther(value: string): bigint {
    return ethers.parseEther(value);
  }

  formatEther(value: bigint): string {
    return ethers.formatEther(value);
  }

  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getTransaction(txHash: string): Promise<ethers.TransactionResponse> {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    return tx;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }
}
