import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EthereumService } from './ethereum.service';

/**
 * Polygon Service
 * Polygon is EVM-compatible, so it uses the same logic as Ethereum
 */
@Injectable()
export class PolygonService extends EthereumService {
  constructor(configService: ConfigService) {
    super(configService);
    
    // Override provider with Polygon RPC
    const rpcUrl = configService.get<string>(
      'POLYGON_RPC_URL',
      'https://polygon-rpc.com',
    );
    
    // Re-initialize provider with Polygon RPC
    const { ethers } = require('ethers');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.requiredConfirmations = configService.get<number>(
      'POLYGON_CONFIRMATIONS',
      128,
    );
  }
}
