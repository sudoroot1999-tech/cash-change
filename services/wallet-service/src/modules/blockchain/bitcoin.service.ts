import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, ECPairAPI } from 'ecpair';

export interface BitcoinTransaction {
  txid: string;
  size: number;
  vsize: number;
  version: number;
  locktime: number;
  vin: any[];
  vout: any[];
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  time?: number;
}

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
}

@Injectable()
export class BitcoinService {
  private readonly logger = new Logger(BitcoinService.name);
  private readonly rpcUrl: string;
  private readonly rpcUser: string;
  private readonly rpcPassword: string;
  private readonly network: bitcoin.Network;
  private readonly requiredConfirmations: number;
  private readonly ECPair: ECPairAPI;

  constructor(private configService: ConfigService) {
    // Initialize ECPair with ecc library
    this.ECPair = ECPairFactory(ecc);
    this.rpcUrl = this.configService.get<string>(
      'BITCOIN_RPC_URL',
      'http://localhost:8332',
    );
    this.rpcUser = this.configService.get<string>('BITCOIN_RPC_USER', 'bitcoin');
    this.rpcPassword = this.configService.get<string>('BITCOIN_RPC_PASSWORD', '');
    
    const networkType = this.configService.get<string>('BITCOIN_NETWORK', 'mainnet');
    this.network =
      networkType === 'mainnet'
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    
    this.requiredConfirmations = this.configService.get<number>(
      'BITCOIN_CONFIRMATIONS',
      6,
    );
  }

  /**
   * Call Bitcoin Core RPC
   */
  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(`${this.rpcUser}:${this.rpcPassword}`).toString('base64'),
        },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: Date.now().toString(),
          method,
          params,
        }),
      });

      const data = await response.json() as any;
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      this.logger.error(`RPC call failed for ${method}:`, error);
      throw error;
    }
  }

  /**
   * Get current block count
   */
  async getBlockCount(): Promise<number> {
    return await this.rpcCall('getblockcount');
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<number> {
    try {
      // Note: Bitcoin Core doesn't have a direct way to get balance by address
      // You need to import the address first or use listunspent
      const unspent = await this.getUnspentOutputs(address);
      const balance = unspent.reduce((sum, utxo) => sum + utxo.value, 0);
      return balance;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get unspent transaction outputs (UTXOs) for an address
   */
  async getUnspentOutputs(address: string): Promise<BitcoinUTXO[]> {
    try {
      // This requires the address to be imported/watched
      const unspent = await this.rpcCall('listunspent', [0, 9999999, [address]]);
      return unspent.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.amount,
        confirmations: utxo.confirmations,
      }));
    } catch (error) {
      this.logger.error(`Failed to get UTXOs for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get transaction by txid
   */
  async getTransaction(txid: string): Promise<BitcoinTransaction | null> {
    try {
      const tx = await this.rpcCall('getrawtransaction', [txid, true]);
      return tx;
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txid}:`, error);
      return null;
    }
  }

  /**
   * Create and send a transaction
   */
  async sendTransaction(
    fromAddress: string,
    privateKeyWIF: string,
    toAddress: string,
    amountBTC: number,
    feeRate: number = 10, // satoshis per byte
  ): Promise<string> {
    try {
      // Get UTXOs
      const utxos = await this.getUnspentOutputs(fromAddress);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs found for address');
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      let inputAmount = 0;
      const amountSatoshis = Math.floor(amountBTC * 1e8);

      // Add inputs
      for (const utxo of utxos) {
        if (inputAmount >= amountSatoshis) break;

        const rawTx = await this.rpcCall('getrawtransaction', [utxo.txid]);
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(rawTx, 'hex'),
        });

        inputAmount += Math.floor(utxo.value * 1e8);
      }

      // Calculate fee (simplified)
      const estimatedSize = psbt.txInputs.length * 148 + 2 * 34 + 10;
      const fee = estimatedSize * feeRate;

      // Add output
      psbt.addOutput({
        address: toAddress,
        value: amountSatoshis,
      });

      // Add change output if necessary
      const change = inputAmount - amountSatoshis - fee;
      if (change > 546) { // Dust threshold
        psbt.addOutput({
          address: fromAddress,
          value: change,
        });
      }

      // Sign transaction
      const keyPair = this.ECPair.fromWIF(privateKeyWIF, this.network);
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();

      // Broadcast
      const txHex = psbt.extractTransaction().toHex();
      const txid = await this.rpcCall('sendrawtransaction', [txHex]);

      this.logger.log(`Bitcoin transaction sent: ${txid}`);
      return txid;
    } catch (error) {
      this.logger.error('Failed to send Bitcoin transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Bitcoin transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(targetBlocks: number = 6): Promise<number> {
    try {
      const result = await this.rpcCall('estimatesmartfee', [targetBlocks]);
      return result.feerate || 0.0001; // BTC per KB
    } catch (error) {
      this.logger.error('Failed to estimate fee:', error);
      return 0.0001; // Default fallback
    }
  }

  /**
   * Validate Bitcoin address
   */
  isValidAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Import address for monitoring (watch-only)
   */
  async importAddress(address: string, label: string = ''): Promise<void> {
    try {
      await this.rpcCall('importaddress', [address, label, false]);
      this.logger.log(`Address imported: ${address}`);
    } catch (error) {
      this.logger.error(`Failed to import address ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get transactions for address
   */
  async getTransactionsForAddress(
    address: string,
    count: number = 100,
  ): Promise<BitcoinTransaction[]> {
    try {
      // This requires the address to be imported first
      const txs = await this.rpcCall('listtransactions', ['*', count, 0, true]);
      
      return txs
        .filter((tx: any) => tx.address === address)
        .map((tx: any) => ({
          txid: tx.txid,
          confirmations: tx.confirmations,
          time: tx.time,
          // Add more fields as needed
        }));
    } catch (error) {
      this.logger.error(`Failed to get transactions for ${address}:`, error);
      return [];
    }
  }
}
