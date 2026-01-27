import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CopyTradingRelationship, CopyTradingStatus, UserProfile } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class CopyTradingService {
  constructor(
    @InjectRepository(CopyTradingRelationship)
    private copyRepo: Repository<CopyTradingRelationship>,
    @InjectRepository(UserProfile)
    private userProfileRepo: Repository<UserProfile>,
  ) {}

  async startCopying(copierId: string, traderId: string, settings: { allocatedAmount: number; copyRatio?: number; maxDrawdown?: number; stopLossAmount?: number; takeProfitAmount?: number; copyAllPairs?: boolean; allowedPairs?: string[]; excludedPairs?: string[] }): Promise<CopyTradingRelationship> {
    if (copierId === traderId) throw new BadRequestException('Cannot copy yourself');

    const trader = await this.userProfileRepo.findOne({ where: { userId: traderId } });
    if (!trader) throw new NotFoundException('Trader not found');
    if (!trader.isTrader || !trader.allowCopyTrading) throw new ForbiddenException('This user does not allow copy trading');

    const existing = await this.copyRepo.findOne({ where: { copierId, traderId } });
    if (existing && existing.status === CopyTradingStatus.ACTIVE) throw new ConflictException('Already copying this trader');

    if (existing) {
      existing.status = CopyTradingStatus.ACTIVE;
      Object.assign(existing, settings);
      existing.stoppedAt = null as any;
      return this.copyRepo.save(existing);
    }

    const copy = this.copyRepo.create({ copierId, traderId, ...settings });
    const saved = await this.copyRepo.save(copy);
    await this.userProfileRepo.increment({ userId: traderId }, 'copiersCount', 1);
    return saved;
  }

  async stopCopying(copierId: string, traderId: string): Promise<void> {
    const copy = await this.copyRepo.findOne({ where: { copierId, traderId, status: CopyTradingStatus.ACTIVE } });
    if (!copy) throw new NotFoundException('Copy trading relationship not found');

    copy.status = CopyTradingStatus.STOPPED;
    copy.stoppedAt = new Date();
    await this.copyRepo.save(copy);
    await this.userProfileRepo.decrement({ userId: traderId }, 'copiersCount', 1);
  }

  async pauseCopying(copierId: string, traderId: string): Promise<CopyTradingRelationship> {
    const copy = await this.copyRepo.findOne({ where: { copierId, traderId, status: CopyTradingStatus.ACTIVE } });
    if (!copy) throw new NotFoundException('Copy trading relationship not found');

    copy.status = CopyTradingStatus.PAUSED;
    return this.copyRepo.save(copy);
  }

  async resumeCopying(copierId: string, traderId: string): Promise<CopyTradingRelationship> {
    const copy = await this.copyRepo.findOne({ where: { copierId, traderId, status: CopyTradingStatus.PAUSED } });
    if (!copy) throw new NotFoundException('Paused copy trading relationship not found');

    copy.status = CopyTradingStatus.ACTIVE;
    return this.copyRepo.save(copy);
  }

  async updateSettings(copierId: string, traderId: string, settings: Partial<CopyTradingRelationship>): Promise<CopyTradingRelationship> {
    const copy = await this.copyRepo.findOne({ where: { copierId, traderId } });
    if (!copy) throw new NotFoundException('Copy trading relationship not found');
    if (copy.status === CopyTradingStatus.STOPPED) throw new ForbiddenException('Cannot update stopped copy trading');

    Object.assign(copy, settings);
    return this.copyRepo.save(copy);
  }

  async getMyCopying(copierId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [copies, total] = await this.copyRepo.findAndCount({
      where: { copierId },
      relations: ['trader'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { items: copies, meta: createPaginationMeta(page, limit, total) };
  }

  async getMyCopiers(traderId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [copies, total] = await this.copyRepo.findAndCount({
      where: { traderId, status: CopyTradingStatus.ACTIVE },
      relations: ['copier'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { items: copies, meta: createPaginationMeta(page, limit, total) };
  }

  async getCopyRelationship(copierId: string, traderId: string): Promise<CopyTradingRelationship | null> {
    return this.copyRepo.findOne({ where: { copierId, traderId }, relations: ['trader', 'copier'] });
  }

  async getTopTraders(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [traders, total] = await this.userProfileRepo.findAndCount({
      where: { isTrader: true, allowCopyTrading: true },
      take: limit,
      skip: (page - 1) * limit,
      order: { copiersCount: 'DESC', totalPnl: 'DESC' },
    });
    return { items: traders, meta: createPaginationMeta(page, limit, total) };
  }

  async updateCopyStats(copierId: string, traderId: string, pnl: number): Promise<void> {
    await this.copyRepo.increment({ copierId, traderId }, 'totalPnl', pnl);
    await this.copyRepo.increment({ copierId, traderId }, 'totalCopiedTrades', 1);
  }
}
