import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';

@Injectable()
export class AssetsService {
  constructor(@InjectRepository(Asset) private readonly assetRepository: Repository<Asset>) {}

  async findAll(): Promise<Asset[]> {
    return this.assetRepository.find({ where: { isActive: true }, order: { symbol: 'ASC' } });
  }

  async findBySymbol(symbol: string): Promise<Asset | null> {
    return this.assetRepository.findOne({ where: { symbol: symbol.toUpperCase() } });
  }
}
