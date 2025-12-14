import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingPair } from './entities/pair.entity';

@Injectable()
export class PairsService {
  constructor(
    @InjectRepository(TradingPair)
    private readonly pairRepository: Repository<TradingPair>,
  ) {}

  async findAll(): Promise<TradingPair[]> {
    return this.pairRepository.find({
      where: { status: 'active' },
      order: { symbol: 'ASC' },
    });
  }

  async findBySymbol(symbol: string): Promise<TradingPair> {
    const pair = await this.pairRepository.findOne({
      where: { symbol: symbol.toUpperCase() },
    });
    if (!pair) {
      throw new NotFoundException('Trading pair not found');
    }
    return pair;
  }

  async findById(id: string): Promise<TradingPair> {
    const pair = await this.pairRepository.findOne({ where: { id } });
    if (!pair) {
      throw new NotFoundException('Trading pair not found');
    }
    return pair;
  }
}
