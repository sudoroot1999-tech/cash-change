import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

/**
 * Chainlink Price Feed Aggregator ABI
 * Only includes the functions we need
 */
const PRICE_FEED_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
];

interface PriceFeedData {
  price: BigNumber;
  decimals: number;
  updatedAt: Date;
  roundId: string;
  source: 'chainlink';
}

interface ChainConfig {
  rpcUrl: string;
  feeds: Record<string, string>; // asset -> feed address
}

/**
 * Chainlink Oracle Service
 * Integrates with Chainlink Price Feeds for reliable on-chain price data
 */
@Injectable()
export class ChainlinkOracleService {
  private readonly logger = new Logger(ChainlinkOracleService.name);
  private readonly enabled: boolean;
  private readonly providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private readonly priceFeeds: Map<string, Map<string, ethers.Contract>> = new Map();
  
  // Mainnet Chainlink Price Feed Addresses
  private readonly ETHEREUM_FEEDS = {
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BNB/USD': '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A',
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    'MATIC/USD': '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',
  };

  private readonly BSC_FEEDS = {
    'BTC/USD': '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    'ETH/USD': '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    'USDT/USD': '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
    'USDC/USD': '0x51597f405303C4377E36123cBc172b13269EA163',
  };

  private readonly POLYGON_FEEDS = {
    'BTC/USD': '0xc907E116054Ad103354f2D350FD2514433D57F6f',
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    'USDT/USD': '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    'USDC/USD': '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
  };

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('CHAINLINK_ENABLED') === 'true';

    if (this.enabled) {
      this.initializeProviders();
      this.logger.log('✅ Chainlink Oracle Service initialized');
    } else {
      this.logger.warn('⚠️ Chainlink Oracle Service disabled');
    }
  }

  /**
   * Initialize blockchain providers and price feed contracts
   */
  private initializeProviders(): void {
    const chains: Record<string, ChainConfig> = {
      ethereum: {
        rpcUrl: this.configService.get<string>('ETHEREUM_RPC_URL') || 'https://eth-mainnet.g.alchemy.com/v2/demo',
        feeds: this.ETHEREUM_FEEDS,
      },
      bsc: {
        rpcUrl: this.configService.get<string>('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org',
        feeds: this.BSC_FEEDS,
      },
      polygon: {
        rpcUrl: this.configService.get<string>('POLYGON_RPC_URL') || 'https://polygon-rpc.com',
        feeds: this.POLYGON_FEEDS,
      },
    };

    for (const [chain, config] of Object.entries(chains)) {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(chain, provider);

        const feedContracts = new Map<string, ethers.Contract>();
        for (const [pair, address] of Object.entries(config.feeds)) {
          const contract = new ethers.Contract(address, PRICE_FEED_ABI, provider);
          feedContracts.set(pair, contract);
        }
        this.priceFeeds.set(chain, feedContracts);

        this.logger.log(`Initialized ${chain} with ${Object.keys(config.feeds).length} price feeds`);
      } catch (error) {
        this.logger.error(`Failed to initialize ${chain}:`, error);
      }
    }
  }

  /**
   * Get price from Chainlink oracle
   */
  async getPrice(asset: string, chain: 'ethereum' | 'bsc' | 'polygon' = 'ethereum'): Promise<BigNumber> {
    if (!this.enabled) {
      throw new Error('Chainlink Oracle is disabled');
    }

    const pair = this.normalizePair(asset);
    const feeds = this.priceFeeds.get(chain);

    if (!feeds) {
      throw new Error(`Chain ${chain} not initialized`);
    }

    const priceFeed = feeds.get(pair);
    if (!priceFeed) {
      throw new Error(`Price feed for ${pair} not available on ${chain}`);
    }

    try {
      const data = await this.fetchPriceFeedData(priceFeed);
      return data.price;
    } catch (error) {
      this.logger.error(`Failed to get price for ${pair} on ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed price feed data
   */
  async getPriceFeedData(
    asset: string,
    chain: 'ethereum' | 'bsc' | 'polygon' = 'ethereum',
  ): Promise<PriceFeedData> {
    if (!this.enabled) {
      throw new Error('Chainlink Oracle is disabled');
    }

    const pair = this.normalizePair(asset);
    const feeds = this.priceFeeds.get(chain);

    if (!feeds) {
      throw new Error(`Chain ${chain} not initialized`);
    }

    const priceFeed = feeds.get(pair);
    if (!priceFeed) {
      throw new Error(`Price feed for ${pair} not available on ${chain}`);
    }

    return await this.fetchPriceFeedData(priceFeed);
  }

  /**
   * Get prices for multiple assets
   */
  async getPrices(
    assets: string[],
    chain: 'ethereum' | 'bsc' | 'polygon' = 'ethereum',
  ): Promise<Record<string, BigNumber>> {
    const prices: Record<string, BigNumber> = {};

    const promises = assets.map(async (asset) => {
      try {
        const price = await this.getPrice(asset, chain);
        prices[asset] = price;
      } catch (error) {
        this.logger.warn(`Failed to get price for ${asset}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    await Promise.all(promises);
    return prices;
  }

  /**
   * Check if price feed is available for an asset
   */
  isPriceFeedAvailable(asset: string, chain: 'ethereum' | 'bsc' | 'polygon' = 'ethereum'): boolean {
    const pair = this.normalizePair(asset);
    const feeds = this.priceFeeds.get(chain);
    return feeds?.has(pair) || false;
  }

  /**
   * Get all available price feeds for a chain
   */
  getAvailableFeeds(chain: 'ethereum' | 'bsc' | 'polygon' = 'ethereum'): string[] {
    const feeds = this.priceFeeds.get(chain);
    return feeds ? Array.from(feeds.keys()) : [];
  }

  /**
   * Fetch data from price feed contract
   */
  private async fetchPriceFeedData(priceFeed: ethers.Contract): Promise<PriceFeedData> {
    try {
      const [roundData, decimals] = await Promise.all([
        priceFeed.latestRoundData(),
        priceFeed.decimals(),
      ]);

      const [roundId, answer, , updatedAt] = roundData;

      // Convert price to BigNumber with proper decimals
      const price = new BigNumber(answer.toString()).div(
        new BigNumber(10).pow(decimals),
      );

      return {
        price,
        decimals: Number(decimals),
        updatedAt: new Date(Number(updatedAt) * 1000),
        roundId: roundId.toString(),
        source: 'chainlink',
      };
    } catch (error) {
      this.logger.error('Failed to fetch price feed data:', error);
      throw error;
    }
  }

  /**
   * Normalize asset to price feed pair format
   */
  private normalizePair(asset: string): string {
    const normalized = asset.toUpperCase();
    
    // If already in pair format (e.g., "BTC/USD"), return as is
    if (normalized.includes('/')) {
      return normalized;
    }

    // Convert single asset to USD pair
    return `${normalized}/USD`;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    chains: string[];
    totalFeeds: number;
  } {
    return {
      enabled: this.enabled,
      chains: Array.from(this.providers.keys()),
      totalFeeds: Array.from(this.priceFeeds.values()).reduce(
        (sum, feeds) => sum + feeds.size,
        0,
      ),
    };
  }

  /**
   * Test connection to all price feeds
   */
  async testConnection(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [chain, feeds] of this.priceFeeds.entries()) {
      for (const [pair] of feeds.entries()) {
        try {
          await this.getPrice(pair.split('/')[0], chain as any);
          results[`${chain}:${pair}`] = true;
        } catch (error) {
          results[`${chain}:${pair}`] = false;
        }
      }
    }

    return results;
  }
}
