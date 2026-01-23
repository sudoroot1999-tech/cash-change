import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EthereumService } from './ethereum.service';

/**
 * BSC (Binance Smart Chain) Service
 * BSC is EVM-compatible, so it uses the same logic as Ethereum
 */
@Injectable()
export class BSCService extends EthereumService {
  constructor(configService: ConfigService) {
    super(configService);
    
    // Override provider with BSC RPC
    const rpcUrl = configService.get<string>(
      'BSC_RPC_URL',
      'https://bsc-dataseed.binance.org',
    );
    
    // Re-initialize provider with BSC RPC
    const { ethers } = require('ethers');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.requiredConfirmations = configService.get<number>(
      'BSC_CONFIRMATIONS',
      15,
    );
  }
}
