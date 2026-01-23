import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayoutHistory, ReferralCommission } from '../entities';
import { RequestPayoutDto, ProcessPayoutDto } from '../dto';

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(PayoutHistory)
    private readonly payoutRepo: Repository<PayoutHistory>,
    @InjectRepository(ReferralCommission)
    private readonly commissionRepo: Repository<ReferralCommission>,
    private readonly configService: ConfigService,
  ) {}

  async requestPayout(userId: string, dto: RequestPayoutDto): Promise<PayoutHistory> {
    const minPayoutAmount = this.configService.get<number>('MINIMUM_PAYOUT_AMOUNT', 50);

    if (dto.amount < minPayoutAmount) {
      throw new BadRequestException(`Minimum payout amount is ${minPayoutAmount}`);
    }

    // Get available commissions
    const availableCommissions = await this.commissionRepo.find({
      where: {
        referrerId: userId,
        status: 'approved',
        payoutId: null,
      },
    });

    const availableAmount = availableCommissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    if (dto.amount > availableAmount) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Calculate fee (e.g., 2% processing fee)
    const feeRate = 0.02;
    const fee = dto.amount * feeRate;
    const netAmount = dto.amount - fee;

    // Calculate tax if applicable
    let taxAmount = 0;
    if (dto.taxInformation?.taxRate) {
      taxAmount = dto.amount * (dto.taxInformation.taxRate / 100);
    }

    // Create payout record
    const payout = this.payoutRepo.create({
      userId,
      amount: dto.amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: dto.paymentMethod,
      commissionCount: 0,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      periodEnd: new Date(),
      fee,
      netAmount: netAmount - taxAmount,
      paymentDetails: dto.paymentDetails,
      taxInformation: dto.taxInformation
        ? {
            ...dto.taxInformation,
            taxAmount,
          }
        : null,
    });

    const savedPayout = await this.payoutRepo.save(payout);

    // Mark commissions as part of this payout
    let remaining = dto.amount;
    const commissionIds = [];

    for (const commission of availableCommissions) {
      if (remaining <= 0) break;

      const commissionAmount = Number(commission.amount);
      if (commissionAmount <= remaining) {
        commission.payoutId = savedPayout.id;
        commission.status = 'paid';
        commission.paidAt = new Date();
        await this.commissionRepo.save(commission);
        
        commissionIds.push(commission.id);
        remaining -= commissionAmount;
      }
    }

    // Update payout with commission count
    savedPayout.commissionCount = commissionIds.length;
    await this.payoutRepo.save(savedPayout);

    return savedPayout;
  }

  async getPayouts(
    userId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = Between(
        filters.startDate || new Date('2000-01-01'),
        filters.endDate || new Date(),
      );
    }

    const [payouts, total] = await this.payoutRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPayoutDetails(payoutId: string, userId: string): Promise<PayoutHistory> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId, userId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  async processPayout(adminId: string, dto: ProcessPayoutDto): Promise<PayoutHistory> {
    const payout = await this.payoutRepo.findOne({
      where: { id: dto.payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    payout.status = dto.status;
    payout.metadata = {
      ...payout.metadata,
      processedBy: adminId,
      notes: dto.notes,
    };

    if (dto.status === 'processing') {
      payout.processedAt = new Date();
    }

    if (dto.status === 'completed') {
      payout.completedAt = new Date();
      payout.transactionId = dto.transactionId;
    }

    if (dto.status === 'failed') {
      payout.failureReason = dto.failureReason;
      
      // Revert commissions back to approved status
      await this.revertPayoutCommissions(dto.payoutId);
    }

    if (dto.status === 'cancelled') {
      // Revert commissions back to approved status
      await this.revertPayoutCommissions(dto.payoutId);
    }

    return await this.payoutRepo.save(payout);
  }

  private async revertPayoutCommissions(payoutId: string): Promise<void> {
    const commissions = await this.commissionRepo.find({
      where: { payoutId },
    });

    for (const commission of commissions) {
      commission.payoutId = null;
      commission.status = 'approved';
      commission.paidAt = null;
      await this.commissionRepo.save(commission);
    }
  }

  async cancelPayout(payoutId: string, userId: string): Promise<PayoutHistory> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId, userId, status: 'pending' },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found or cannot be cancelled');
    }

    payout.status = 'cancelled';
    await this.revertPayoutCommissions(payoutId);

    return await this.payoutRepo.save(payout);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processAutomaticPayouts(): Promise<void> {
    const autoPayoutEnabled = this.configService.get<boolean>('AUTO_PAYOUT_ENABLED', false);
    
    if (!autoPayoutEnabled) {
      return;
    }

    const schedule = this.configService.get<string>('PAYOUT_SCHEDULE', 'weekly');
    const today = new Date().getDay();
    const payoutDay = this.configService.get<string>('PAYOUT_DAY', 'monday');

    // Check if today is payout day
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    if (schedule === 'weekly' && today !== dayMap[payoutDay.toLowerCase()]) {
      return;
    }

    if (schedule === 'monthly' && new Date().getDate() !== 1) {
      return;
    }

    // Find users with pending commissions above minimum threshold
    const minPayoutAmount = this.configService.get<number>('MINIMUM_PAYOUT_AMOUNT', 50);

    const commissions = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('commission.referrerId', 'userId')
      .addSelect('SUM(commission.amount)', 'totalAmount')
      .where('commission.status = :status', { status: 'approved' })
      .andWhere('commission.payoutId IS NULL')
      .groupBy('commission.referrerId')
      .having('SUM(commission.amount) >= :minAmount', { minAmount: minPayoutAmount })
      .getRawMany();

    for (const { userId, totalAmount } of commissions) {
      try {
        // Auto-create payout with default payment method (internal wallet)
        await this.requestPayout(userId, {
          amount: parseFloat(totalAmount),
          paymentMethod: 'internal_wallet',
          paymentDetails: {
            walletAddress: 'internal',
          },
        });
      } catch (error) {
        console.error(`Failed to create auto payout for user ${userId}:`, error);
      }
    }
  }

  async getPayoutStats(userId?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const allPayouts = await this.payoutRepo.find({ where });

    const totalPaid = allPayouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.netAmount), 0);

    const totalPending = allPayouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalFailed = allPayouts
      .filter((p) => p.status === 'failed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalPayouts: allPayouts.length,
      totalPaid,
      totalPending,
      totalFailed,
      averagePayoutAmount: allPayouts.length > 0 
        ? allPayouts.reduce((sum, p) => sum + Number(p.amount), 0) / allPayouts.length 
        : 0,
      byStatus: {
        pending: allPayouts.filter((p) => p.status === 'pending').length,
        processing: allPayouts.filter((p) => p.status === 'processing').length,
        completed: allPayouts.filter((p) => p.status === 'completed').length,
        failed: allPayouts.filter((p) => p.status === 'failed').length,
        cancelled: allPayouts.filter((p) => p.status === 'cancelled').length,
      },
      byPaymentMethod: this.groupByPaymentMethod(allPayouts),
    };
  }

  private groupByPaymentMethod(payouts: PayoutHistory[]) {
    const grouped = {};
    for (const payout of payouts) {
      if (!grouped[payout.paymentMethod]) {
        grouped[payout.paymentMethod] = { count: 0, total: 0 };
      }
      grouped[payout.paymentMethod].count += 1;
      grouped[payout.paymentMethod].total += Number(payout.amount);
    }
    return grouped;
  }

  async getAllPendingPayouts(): Promise<PayoutHistory[]> {
    return await this.payoutRepo.find({
      where: { status: In(['pending', 'processing']) },
      order: { createdAt: 'ASC' },
    });
  }
}
