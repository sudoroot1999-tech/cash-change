import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { P2pTrade, TradeStatus } from '../entities/p2p-trade.entity';
import { P2pAd } from '../entities/p2p-ad.entity';
import { InitiateTradeDto } from '../dto/initiate-trade.dto';
import { PaymentMadeDto } from '../dto/payment-made.dto';
import { AdService } from './ad.service';
import { EscrowService } from './escrow.service';
import { StatisticsService } from './statistics.service';
import { NotificationService } from './notification.service';
import { FraudPreventionService } from './fraud-prevention.service';

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(P2pTrade)
    private tradeRepository: Repository<P2pTrade>,
    @InjectRepository(P2pAd)
    private adRepository: Repository<P2pAd>,
    private adService: AdService,
    private escrowService: EscrowService,
    private statisticsService: StatisticsService,
    private notificationService: NotificationService,
    private fraudPreventionService: FraudPreventionService,
  ) {}

  async initiateTrade(userId: string, dto: InitiateTradeDto): Promise<P2pTrade> {
    // Get ad
    const ad = await this.adRepository.findOne({ where: { id: dto.adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    // Validate ad is active
    if (ad.status !== 'active') {
      throw new BadRequestException('Ad is not active');
    }

    // Check if user is blacklisted
    if (ad.blacklist && ad.blacklist.includes(userId)) {
      throw new ForbiddenException('You are blacklisted from trading with this seller');
    }

    // Check if user is trying to trade with themselves
    if (ad.userId === userId) {
      throw new BadRequestException('You cannot trade with yourself');
    }

    // Validate amount limits
    if (dto.amount < ad.minLimit || dto.amount > ad.maxLimit) {
      throw new BadRequestException(`Amount must be between ${ad.minLimit} and ${ad.maxLimit}`);
    }

    // Check payment method
    if (!ad.paymentMethods.includes(dto.paymentMethod)) {
      throw new BadRequestException('Payment method not supported by this ad');
    }

    // Calculate crypto amount
    const cryptoAmount = dto.amount / ad.price;

    // Check available amount
    if (cryptoAmount > ad.availableAmount) {
      throw new BadRequestException('Insufficient available amount');
    }

    // Fraud prevention checks
    await this.fraudPreventionService.checkTradeEligibility(userId, dto.amount);

    // Determine buyer and seller based on ad type
    let buyerId: string;
    let sellerId: string;

    if (ad.type === 'sell') {
      // Ad is selling crypto, user is buying
      buyerId = userId;
      sellerId = ad.userId;
    } else {
      // Ad is buying crypto, user is selling
      buyerId = ad.userId;
      sellerId = userId;
    }

    // Calculate escrow fee
    const escrowFeePercentage = parseFloat(process.env.ESCROW_FEE_PERCENTAGE || '0.5');
    const escrowFee = (cryptoAmount * escrowFeePercentage) / 100;

    // Lock crypto in escrow
    const escrowResult = await this.escrowService.lockInEscrow(
      sellerId,
      ad.cryptoAsset,
      cryptoAmount,
    );

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ad.paymentTimeLimit);

    // Create trade
    const trade = this.tradeRepository.create({
      adId: ad.id,
      buyerId,
      sellerId,
      cryptoAsset: ad.cryptoAsset,
      cryptoAmount,
      fiatCurrency: ad.fiatCurrency,
      fiatAmount: dto.amount,
      price: ad.price,
      paymentMethod: dto.paymentMethod,
      escrowFee,
      escrowAddress: escrowResult.escrowAddress,
      escrowTxHash: escrowResult.txHash,
      status: TradeStatus.PENDING,
      notes: dto.notes,
      expiresAt,
    });

    const savedTrade = await this.tradeRepository.save(trade);

    // Decrease available amount in ad
    await this.adService.decreaseAvailableAmount(ad.id, cryptoAmount);

    // Update statistics
    await this.adService.updateAdStats(ad.id, false);

    // Send notifications
    await this.notificationService.notifyTradeInitiated(savedTrade);

    return savedTrade;
  }

  async markPaymentMade(tradeId: string, userId: string, dto: PaymentMadeDto): Promise<P2pTrade> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can mark payment as made');
    }

    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException('Trade is not in pending status');
    }

    // Check if trade has expired
    if (new Date() > trade.expiresAt) {
      throw new BadRequestException('Trade has expired');
    }

    trade.status = TradeStatus.PAID;
    trade.paymentProof = dto.paymentProof || [];
    trade.paymentReference = dto.paymentReference;
    trade.paidAt = new Date();

    if (dto.notes) {
      trade.notes = trade.notes ? `${trade.notes}\n${dto.notes}` : dto.notes;
    }

    const savedTrade = await this.tradeRepository.save(trade);

    // Notify seller
    await this.notificationService.notifyPaymentMade(savedTrade);

    return savedTrade;
  }

  async releaseCrypto(tradeId: string, userId: string, notes?: string): Promise<P2pTrade> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can release crypto');
    }

    if (trade.status !== TradeStatus.PAID) {
      throw new BadRequestException('Payment must be marked as made before releasing');
    }

    // Release crypto from escrow
    const releaseResult = await this.escrowService.releaseFromEscrow(
      trade.escrowAddress,
      trade.buyerId,
      trade.cryptoAsset,
      trade.cryptoAmount,
    );

    trade.status = TradeStatus.COMPLETED;
    trade.completedAt = new Date();
    trade.releaseTxHash = releaseResult.txHash;
    trade.sellerNotes = notes;

    const savedTrade = await this.tradeRepository.save(trade);

    // Update ad stats
    await this.adService.updateAdStats(trade.adId, true);

    // Update user statistics
    await this.statisticsService.updateAfterTrade(savedTrade);

    // Notify buyer
    await this.notificationService.notifyTradeCompleted(savedTrade);

    return savedTrade;
  }

  async cancelTrade(tradeId: string, userId: string, reason: string): Promise<P2pTrade> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    if (![TradeStatus.PENDING, TradeStatus.PAID].includes(trade.status)) {
      throw new BadRequestException('Trade cannot be cancelled at this stage');
    }

    // Only allow buyer to cancel in PENDING status before payment
    if (trade.status === TradeStatus.PENDING && trade.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can cancel before payment');
    }

    // If paid status, both parties can request cancellation but needs admin approval
    if (trade.status === TradeStatus.PAID) {
      throw new BadRequestException('Please open a dispute to cancel after payment');
    }

    // Refund crypto from escrow
    await this.escrowService.refundFromEscrow(
      trade.escrowAddress,
      trade.sellerId,
      trade.cryptoAsset,
      trade.cryptoAmount,
    );

    trade.status = TradeStatus.CANCELLED;
    trade.cancelledAt = new Date();
    trade.cancelledBy = userId;
    trade.cancellationReason = reason;

    const savedTrade = await this.tradeRepository.save(trade);

    // Return available amount to ad
    await this.adService.increaseAvailableAmount(trade.adId, trade.cryptoAmount);

    // Notify other party
    await this.notificationService.notifyTradeCancelled(savedTrade);

    return savedTrade;
  }

  async getTradeById(tradeId: string, userId: string): Promise<P2pTrade> {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId },
      relations: ['ad'],
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not authorized to view this trade');
    }

    return trade;
  }

  async getUserTrades(userId: string, status?: TradeStatus): Promise<P2pTrade[]> {
    const where: any = [{ buyerId: userId }, { sellerId: userId }];

    if (status) {
      where[0].status = status;
      where[1].status = status;
    }

    return this.tradeRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['ad'],
    });
  }

  async getActiveTrades(userId: string): Promise<P2pTrade[]> {
    return this.tradeRepository.find({
      where: [
        { buyerId: userId, status: TradeStatus.PENDING },
        { buyerId: userId, status: TradeStatus.PAID },
        { sellerId: userId, status: TradeStatus.PENDING },
        { sellerId: userId, status: TradeStatus.PAID },
      ],
      order: { createdAt: 'DESC' },
      relations: ['ad'],
    });
  }

  async processExpiredTrades(): Promise<void> {
    const expiredTrades = await this.tradeRepository.find({
      where: {
        status: TradeStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const trade of expiredTrades) {
      try {
        // Refund crypto to seller
        await this.escrowService.refundFromEscrow(
          trade.escrowAddress,
          trade.sellerId,
          trade.cryptoAsset,
          trade.cryptoAmount,
        );

        trade.status = TradeStatus.EXPIRED;
        await this.tradeRepository.save(trade);

        // Return available amount to ad
        await this.adService.increaseAvailableAmount(trade.adId, trade.cryptoAmount);

        // Notify both parties
        await this.notificationService.notifyTradeExpired(trade);
      } catch (error) {
        console.error(`Failed to process expired trade ${trade.id}:`, error);
      }
    }
  }
}
