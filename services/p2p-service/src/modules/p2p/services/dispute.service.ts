import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2pDispute, DisputeStatus, DisputeResolution } from '../entities/p2p-dispute.entity';
import { P2pTrade, TradeStatus } from '../entities/p2p-trade.entity';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { EscrowService } from './escrow.service';
import { StatisticsService } from './statistics.service';
import { NotificationService } from './notification.service';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(P2pDispute)
    private disputeRepository: Repository<P2pDispute>,
    @InjectRepository(P2pTrade)
    private tradeRepository: Repository<P2pTrade>,
    private escrowService: EscrowService,
    private statisticsService: StatisticsService,
    private notificationService: NotificationService,
  ) {}

  async createDispute(tradeId: string, userId: string, dto: CreateDisputeDto): Promise<P2pDispute> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    if (![TradeStatus.PAID, TradeStatus.PENDING].includes(trade.status)) {
      throw new BadRequestException('Dispute can only be opened for pending or paid trades');
    }

    // Check if dispute already exists
    const existingDispute = await this.disputeRepository.findOne({
      where: { tradeId },
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this trade');
    }

    // Update trade status
    trade.status = TradeStatus.DISPUTED;
    await this.tradeRepository.save(trade);

    // Create dispute
    const dispute = this.disputeRepository.create({
      tradeId,
      openedBy: userId,
      reason: dto.reason,
      description: dto.description,
      evidence: dto.evidence || [],
      status: DisputeStatus.OPEN,
    });

    const savedDispute = await this.disputeRepository.save(dispute);

    // Notify admin and other party
    await this.notificationService.notifyDisputeCreated(savedDispute, trade);

    return savedDispute;
  }

  async getDisputeById(disputeId: string): Promise<P2pDispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['trade'],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async getDisputeByTradeId(tradeId: string): Promise<P2pDispute | null> {
    return this.disputeRepository.findOne({
      where: { tradeId },
      relations: ['trade'],
    });
  }

  async assignDispute(disputeId: string, adminId: string): Promise<P2pDispute> {
    const dispute = await this.disputeRepository.findOne({ where: { id: disputeId } });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute is not in open status');
    }

    dispute.assignedTo = adminId;
    dispute.status = DisputeStatus.UNDER_REVIEW;

    return this.disputeRepository.save(dispute);
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolution,
    resolutionNotes: string,
  ): Promise<P2pDispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['trade'],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const trade = dispute.trade;

    // Execute resolution
    switch (resolution) {
      case DisputeResolution.BUYER_WINS:
        // Release crypto to buyer
        await this.escrowService.releaseFromEscrow(
          trade.escrowAddress,
          trade.buyerId,
          trade.cryptoAsset,
          trade.cryptoAmount,
        );
        trade.status = TradeStatus.COMPLETED;
        trade.completedAt = new Date();
        break;

      case DisputeResolution.SELLER_WINS:
        // Refund crypto to seller
        await this.escrowService.refundFromEscrow(
          trade.escrowAddress,
          trade.sellerId,
          trade.cryptoAsset,
          trade.cryptoAmount,
        );
        trade.status = TradeStatus.REFUNDED;
        break;

      case DisputeResolution.PARTIAL_REFUND:
        // This would require custom logic based on admin decision
        // For now, we'll just release to buyer
        await this.escrowService.releaseFromEscrow(
          trade.escrowAddress,
          trade.buyerId,
          trade.cryptoAsset,
          trade.cryptoAmount,
        );
        trade.status = TradeStatus.COMPLETED;
        trade.completedAt = new Date();
        break;

      case DisputeResolution.CANCELLED:
        // Refund to seller
        await this.escrowService.refundFromEscrow(
          trade.escrowAddress,
          trade.sellerId,
          trade.cryptoAsset,
          trade.cryptoAmount,
        );
        trade.status = TradeStatus.CANCELLED;
        trade.cancelledAt = new Date();
        break;
    }

    await this.tradeRepository.save(trade);

    // Update dispute
    dispute.resolution = resolution;
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = adminId;
    dispute.status = DisputeStatus.RESOLVED;

    const savedDispute = await this.disputeRepository.save(dispute);

    // Update statistics
    await this.statisticsService.updateAfterDisputeResolution(trade, resolution);

    // Notify parties
    await this.notificationService.notifyDisputeResolved(savedDispute, trade);

    return savedDispute;
  }

  async getAllDisputes(status?: DisputeStatus): Promise<P2pDispute[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.disputeRepository.find({
      where,
      relations: ['trade'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserDisputes(userId: string): Promise<P2pDispute[]> {
    const disputes = await this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.trade', 'trade')
      .where('trade.buyerId = :userId OR trade.sellerId = :userId', { userId })
      .orderBy('dispute.createdAt', 'DESC')
      .getMany();

    return disputes;
  }

  async addAdminNote(disputeId: string, _adminId: string, note: string): Promise<P2pDispute> {
    const dispute = await this.disputeRepository.findOne({ where: { id: disputeId } });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    dispute.adminNotes = dispute.adminNotes ? `${dispute.adminNotes}\n\n[${new Date().toISOString()}] ${note}` : note;

    return this.disputeRepository.save(dispute);
  }
}
