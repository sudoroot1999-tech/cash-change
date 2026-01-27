import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private providers: Map<number, ethers.Provider> = new Map();
  private signers: Map<number, ethers.Wallet> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Ethereum
    const ethRpcUrl = this.configService.get('ETH_RPC_URL');
    if (ethRpcUrl) {
      this.providers.set(1, new ethers.JsonRpcProvider(ethRpcUrl));
    }

    // Polygon
    const polygonRpcUrl = this.configService.get('POLYGON_RPC_URL');
    if (polygonRpcUrl) {
      this.providers.set(137, new ethers.JsonRpcProvider(polygonRpcUrl));
    }

    // BSC
    const bscRpcUrl = this.configService.get('BSC_RPC_URL');
    if (bscRpcUrl) {
      this.providers.set(56, new ethers.JsonRpcProvider(bscRpcUrl));
    }

    // Initialize signers
    const operatorKey = this.configService.get('OPERATOR_PRIVATE_KEY');
    if (operatorKey) {
      this.providers.forEach((provider, chainId) => {
        this.signers.set(chainId, new ethers.Wallet(operatorKey, provider));
      });
    }
  }

  getProvider(chainId: number): ethers.Provider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`Provider not configured for chain ID: ${chainId}`);
    }
    return provider;
  }

  getSigner(chainId: number): ethers.Wallet {
    const signer = this.signers.get(chainId);
    if (!signer) {
      throw new Error(`Signer not configured for chain ID: ${chainId}`);
    }
    return signer;
  }

  /**
   * Get contract instance
   */
  getContract(address: string, abi: any[], chainId: number, withSigner = false): ethers.Contract {
    if (withSigner) {
      const signer = this.getSigner(chainId);
      return new ethers.Contract(address, abi, signer);
    } else {
      const provider = this.getProvider(chainId);
      return new ethers.Contract(address, abi, provider);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string, chainId: number): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(chainId);
    return await provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, chainId: number, confirmations = 1): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(chainId);
    return await provider.waitForTransaction(txHash, confirmations);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(chainId: number): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getBlockNumber();
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, chainId: number): Promise<string> {
    const provider = this.getProvider(chainId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Verify signature
   */
  verifySignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      this.logger.error(`Error verifying signature: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Sign message
   */
  async signMessage(message: string, chainId: number): Promise<string> {
    const signer = this.getSigner(chainId);
    return await signer.signMessage(message);
  }

  /**
   * Create typed data signature (EIP-712)
   */
  async signTypedData(domain: any, types: any, value: any, chainId: number): Promise<string> {
    const signer = this.getSigner(chainId);
    return await signer.signTypedData(domain, types, value);
  }

  /**
   * Verify EIP-712 signature
   */
  verifyTypedData(domain: any, types: any, value: any, signature: string): string {
    return ethers.verifyTypedData(domain, types, value, signature);
  }

  /**
   * Get ERC-721 token owner
   */
  async getERC721Owner(contractAddress: string, tokenId: string, chainId: number): Promise<string> {
    const abi = ['function ownerOf(uint256 tokenId) view returns (address)'];
    const contract = this.getContract(contractAddress, abi, chainId);
    return await contract.ownerOf(tokenId);
  }

  /**
   * Get ERC-1155 token balance
   */
  async getERC1155Balance(
    contractAddress: string,
    account: string,
    tokenId: string,
    chainId: number,
  ): Promise<string> {
    const abi = ['function balanceOf(address account, uint256 id) view returns (uint256)'];
    const contract = this.getContract(contractAddress, abi, chainId);
    const balance = await contract.balanceOf(account, tokenId);
    return balance.toString();
  }

  /**
   * Get ERC-721 token URI
   */
  async getERC721TokenURI(contractAddress: string, tokenId: string, chainId: number): Promise<string> {
    const abi = ['function tokenURI(uint256 tokenId) view returns (string)'];
    const contract = this.getContract(contractAddress, abi, chainId);
    return await contract.tokenURI(tokenId);
  }

  /**
   * Get ERC-1155 token URI
   */
  async getERC1155TokenURI(contractAddress: string, tokenId: string, chainId: number): Promise<string> {
    const abi = ['function uri(uint256 id) view returns (string)'];
    const contract = this.getContract(contractAddress, abi, chainId);
    return await contract.uri(tokenId);
  }

  /**
   * Check if contract supports interface (ERC-165)
   */
  async supportsInterface(contractAddress: string, interfaceId: string, chainId: number): Promise<boolean> {
    try {
      const abi = ['function supportsInterface(bytes4 interfaceId) view returns (bool)'];
      const contract = this.getContract(contractAddress, abi, chainId);
      return await contract.supportsInterface(interfaceId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(tx: any, chainId: number): Promise<bigint> {
    const provider = this.getProvider(chainId);
    return await provider.estimateGas(tx);
  }

  /**
   * Get gas price
   */
  async getGasPrice(chainId: number): Promise<bigint> {
    const provider = this.getProvider(chainId);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Parse event logs
   */
  parseEventLogs(receipt: ethers.TransactionReceipt, contractInterface: ethers.Interface): any[] {
    const parsedLogs = [];
    
    for (const log of receipt.logs) {
      try {
        const parsed = contractInterface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        parsedLogs.push(parsed);
      } catch (error) {
        // Log not from this contract or unrecognized event
      }
    }
    
    return parsedLogs;
  }

  /**
   * Format address to checksum
   */
  toChecksumAddress(address: string): string {
    return ethers.getAddress(address);
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}
