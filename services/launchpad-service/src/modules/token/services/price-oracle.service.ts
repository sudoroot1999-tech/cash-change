import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenPrice } from '../entities/token-price.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import BigNumber from 'bignumber.js';

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name);

  constructor(
    @InjectRepository(TokenPrice)
    private tokenPriceRepository: Repository<TokenPrice>,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updatePrice() {
    try {
      this.logger.log('Fetching token price from oracles...');

      const prices = await Promise.allSettled([
        this.fetchFromUniswap(),
        this.fetchFromPancakeSwap(),
        this.fetchFromCoinGecko(),
      ]);

      const validPrices = prices
        .filter((p) => p.status === 'fulfilled')
        .map((p: any) => p.value)
        .filter((p) => p && new BigNumber(p.price).isGreaterThan(0));

      if (validPrices.length === 0) {
        this.logger.warn('No valid prices found from oracles');
        return;
      }

      // Calculate average price
      const avgPrice = validPrices
        .reduce(
          (sum, p) => sum.plus(p.price),
          new BigNumber(0),
        )
        .dividedBy(validPrices.length)
        .toString();

      // Get volume (use highest available)
      const volume24h = validPrices
        .map((p) => new BigNumber(p.volume24h || 0))
        .reduce((max, v) => (v.isGreaterThan(max) ? v : max), new BigNumber(0))
        .toString();

      // Calculate market cap
      const circulatingSupply = await this.getCirculatingSupply();
      const marketCap = new BigNumber(avgPrice)
        .multipliedBy(circulatingSupply)
        .toString();

      // Save price
      const priceRecord = this.tokenPriceRepository.create({
        price: avgPrice,
        priceEth: validPrices[0]?.priceEth || '0',
        priceBnb: validPrices[0]?.priceBnb || '0',
        volume24h: volume24h,
        marketCap,
        circulatingSupply,
        source: 'aggregated',
        timestamp: new Date(),
      });

      await this.tokenPriceRepository.save(priceRecord);

      this.logger.log(`Price updated: $${avgPrice}`);
    } catch (error) {
      this.logger.error('Failed to update price:', error);
    }
  }

  private async fetchFromUniswap() {
    try {
      const tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS');
      
      // Uniswap V3 subgraph query
      const query = `
        {
          token(id: "${tokenAddress.toLowerCase()}") {
            derivedETH
            totalValueLocked
            volume24h: volumeUSD
          }
          bundle(id: "1") {
            ethPriceUSD
          }
        }
      `;

      const response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        { query },
        { timeout: 5000 },
      );

      const { token, bundle } = response.data.data;
      const ethPriceUSD = bundle.ethPriceUSD;
      const priceUSD = new BigNumber(token.derivedETH).multipliedBy(ethPriceUSD);

      return {
        price: priceUSD.toString(),
        priceEth: token.derivedETH,
        priceBnb: '0',
        volume24h: token.volume24h,
        source: 'uniswap',
      };
    } catch (error) {
      this.logger.warn('Failed to fetch from Uniswap:', error.message);
      throw error;
    }
  }

  private async fetchFromPancakeSwap() {
    try {
      const tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS_BSC');

      // PancakeSwap subgraph query
      const query = `
        {
          token(id: "${tokenAddress.toLowerCase()}") {
            derivedBNB
            totalValueLocked
            volume24h: volumeUSD
          }
          bundle(id: "1") {
            bnbPrice
          }
        }
      `;

      const response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v2',
        { query },
        { timeout: 5000 },
      );

      const { token, bundle } = response.data.data;
      const bnbPriceUSD = bundle.bnbPrice;
      const priceUSD = new BigNumber(token.derivedBNB).multipliedBy(bnbPriceUSD);

      return {
        price: priceUSD.toString(),
        priceEth: '0',
        priceBnb: token.derivedBNB,
        volume24h: token.volume24h,
        source: 'pancakeswap',
      };
    } catch (error) {
      this.logger.warn('Failed to fetch from PancakeSwap:', error.message);
      throw error;
    }
  }

  private async fetchFromCoinGecko() {
    try {
      const coinId = this.configService.get<string>('COINGECKO_COIN_ID');
      
      if (!coinId) {
        throw new Error('CoinGecko coin ID not configured');
      }

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd,eth,bnb',
            include_24hr_vol: true,
          },
          timeout: 5000,
        },
      );

      const data = response.data[coinId];

      return {
        price: data.usd.toString(),
        priceEth: data.eth.toString(),
        priceBnb: data.bnb.toString(),
        volume24h: data.usd_24h_vol?.toString() || '0',
        source: 'coingecko',
      };
    } catch (error) {
      this.logger.warn('Failed to fetch from CoinGecko:', error.message);
      throw error;
    }
  }

  private async getCirculatingSupply(): Promise<string> {
    // This should fetch from blockchain
    // For now, return estimated circulating supply
    return '600000000'; // 60% of total supply
  }

  async getLatestPrice(): Promise<TokenPrice | null> {
    return this.tokenPriceRepository.findOne({
      where: {},
      order: { timestamp: 'DESC' },
    });
  }

  async getPriceHistory(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.tokenPriceRepository.find({
      where: {
        timestamp: MoreThan(since) as any,
      },
      order: { timestamp: 'ASC' },
    });
  }

  async getPriceAt(timestamp: Date): Promise<TokenPrice | null> {
    return this.tokenPriceRepository.findOne({
      where: {
        timestamp: MoreThan(timestamp) as any,
      },
      order: { timestamp: 'ASC' },
    });
  }
}

function MoreThan(value: any): any {
  return value;
}
