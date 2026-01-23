import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

export interface EthereumTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  confirmations: number;
  gasPrice: string;
  gasUsed: string;
}

@Injectable()
export class EthereumService {
  private readonly logger = new Logger(EthereumService.name);
  protected provider: ethers.JsonRpcProvider;
  protected requiredConfirmations: number;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>(
      'ETHEREUM_RPC_URL',
      'https://eth-mainnet.g.alchemy.com/v2/demo',
    );
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.requiredConfirmations = this.configService.get<number>(
      'ETHEREUM_CONFIRMATIONS',
      12,
    );
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
  ): Promise<string> {
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
    ]);

    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<EthereumTransaction | null> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      const currentBlock = await this.getCurrentBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: ethers.formatEther(tx.value),
        blockNumber: receipt.blockNumber,
        confirmations,
        gasPrice: ethers.formatUnits(tx.gasPrice || 0, 'gwei'),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Monitor address for incoming transactions
   */
  async getTransactionsForAddress(
    address: string,
    fromBlock: number,
  ): Promise<EthereumTransaction[]> {
    try {
      const currentBlock = await this.getCurrentBlockNumber();
      const logs = await this.provider.getLogs({
        address: null,
        fromBlock,
        toBlock: currentBlock,
        topics: null,
      });

      // Filter and process transactions
      const transactions: EthereumTransaction[] = [];
      
      // This is a simplified version. In production, use event indexers like The Graph
      // or services like Etherscan API for better performance
      
      return transactions;
    } catch (error) {
      this.logger.error(`Failed to get transactions for ${address}:`, error);
      return [];
    }
  }

  /**
   * Send ETH transaction
   */
  async sendTransaction(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
    gasPrice?: string,
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
      
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
        gasPrice: gasPrice ? ethers.parseUnits(gasPrice, 'gwei') : undefined,
      });

      this.logger.log(`Transaction sent: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      this.logger.error('Failed to send transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Send ERC20 token transaction
   */
  async sendTokenTransaction(
    fromPrivateKey: string,
    tokenAddress: string,
    toAddress: string,
    amount: string,
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
      
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
      const decimals = await contract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await contract.transfer(toAddress, amountInWei);
      this.logger.log(`Token transaction sent: ${tx.hash}`);
      
      return tx.hash;
    } catch (error) {
      this.logger.error('Failed to send token transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Token transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    from: string,
    to: string,
    amount: string,
  ): Promise<string> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        from,
        to,
        value: ethers.parseEther(amount),
      });

      return gasEstimate.toString();
    } catch (error) {
      this.logger.error('Failed to estimate gas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gas estimation failed: ${errorMessage}`);
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    const feeData = await this.provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || 0, 'gwei');
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmations(
    txHash: string,
    confirmations: number = this.requiredConfirmations,
  ): Promise<boolean> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      this.logger.error(`Failed to wait for confirmations for ${txHash}:`, error);
      return false;
    }
  }
}
