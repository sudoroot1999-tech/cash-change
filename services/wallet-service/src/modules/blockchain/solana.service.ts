import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export interface SolanaTransaction {
  signature: string;
  slot: number;
  err: any;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: string;
}

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private readonly requiredConfirmations: number;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>(
      'SOLANA_RPC_URL',
      'https://api.mainnet-beta.solana.com',
    );
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.requiredConfirmations = this.configService.get<number>(
      'SOLANA_CONFIRMATIONS',
      1,
    );
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  /**
   * Get SOL balance
   */
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get SPL token balance
   */
  async getTokenBalance(
    walletAddress: string,
    tokenMintAddress: string,
  ): Promise<number> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { mint: tokenMintPublicKey },
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      return parseFloat(balance.uiAmountString);
    } catch (error) {
      this.logger.error(
        `Failed to get token balance for ${walletAddress}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Get transaction by signature
   */
  async getTransaction(signature: string): Promise<SolanaTransaction | null> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      return {
        signature,
        slot: tx.slot,
        err: tx.meta?.err,
        memo: null,
        blockTime: tx.blockTime,
        confirmationStatus: 'confirmed',
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction ${signature}:`, error);
      return null;
    }
  }

  /**
   * Send SOL transaction
   */
  async sendTransaction(
    fromPrivateKey: Uint8Array,
    toAddress: string,
    amountSOL: number,
  ): Promise<string> {
    try {
      const fromKeypair = Keypair.fromSecretKey(fromPrivateKey);
      const toPublicKey = new PublicKey(toAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: amountSOL * LAMPORTS_PER_SOL,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
      );

      this.logger.log(`Solana transaction sent: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error('Failed to send Solana transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Solana transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Get recent transactions for an address
   */
  async getTransactionsForAddress(
    address: string,
    limit: number = 100,
  ): Promise<SolanaTransaction[]> {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit },
      );

      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        err: sig.err,
        memo: sig.memo || null,
        blockTime: sig.blockTime,
        confirmationStatus: sig.confirmationStatus || 'confirmed',
      }));
    } catch (error) {
      this.logger.error(`Failed to get transactions for ${address}:`, error);
      return [];
    }
  }

  /**
   * Validate Solana address
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get minimum balance for rent exemption
   */
  async getMinimumBalanceForRentExemption(dataLength: number = 0): Promise<number> {
    const lamports = await this.connection.getMinimumBalanceForRentExemption(
      dataLength,
    );
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Confirm transaction
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature);
      return !result.value.err;
    } catch (error) {
      this.logger.error(`Failed to confirm transaction ${signature}:`, error);
      return false;
    }
  }

  /**
   * Get recent blockhash
   */
  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    return blockhash;
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(): Promise<number> {
    try {
      // Solana has a fixed fee per signature
      const { feeCalculator } = await this.connection.getRecentBlockhash();
      return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
    } catch (error) {
      this.logger.error('Failed to estimate fee:', error);
      return 0.000005; // Default Solana fee
    }
  }
}
