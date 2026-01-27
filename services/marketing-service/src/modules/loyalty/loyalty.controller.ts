import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query 
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyTier, TierLevel } from '../../entities/LoyaltyTier.entity';
import { PointsSource } from '../../entities/LoyaltyTransaction.entity';

@Controller('marketing/loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // Tier Management
  @Post('tiers')
  async createOrUpdateTier(@Body() data: Partial<LoyaltyTier>) {
    return this.loyaltyService.createOrUpdateTier(data);
  }

  @Get('tiers')
  async getAllTiers() {
    return this.loyaltyService.getAllTiers();
  }

  @Get('tiers/:level')
  async getTier(@Param('level') level: TierLevel) {
    return this.loyaltyService.getTier(level);
  }

  // User Loyalty
  @Post('users/:userId/initialize')
  async initializeUserLoyalty(
    @Param('userId') userId: string,
    @Body('birthday') birthday?: Date
  ) {
    return this.loyaltyService.initializeUserLoyalty(userId, birthday);
  }

  @Get('users/:userId/status')
  async getLoyaltyStatus(@Param('userId') userId: string) {
    return this.loyaltyService.getLoyaltyStatus(userId);
  }

  // Points Management
  @Post('users/:userId/award-points')
  async awardPoints(
    @Param('userId') userId: string,
    @Body('points') points: number,
    @Body('source') source: PointsSource,
    @Body('referenceId') referenceId?: string,
    @Body('referenceType') referenceType?: string,
    @Body('description') description?: string,
    @Body('expiresInDays') expiresInDays?: number
  ) {
    return this.loyaltyService.awardPoints(
      userId,
      points,
      source,
      referenceId,
      referenceType,
      description,
      expiresInDays
    );
  }

  @Post('users/:userId/redeem-points')
  async redeemPoints(
    @Param('userId') userId: string,
    @Body('points') points: number,
    @Body('description') description: string,
    @Body('referenceId') referenceId?: string
  ) {
    return this.loyaltyService.redeemPoints(userId, points, description, referenceId);
  }

  @Post('expire-points')
  async expirePoints() {
    await this.loyaltyService.expirePoints();
    return { success: true, message: 'Expired points processed' };
  }

  // Activity Recording
  @Post('users/:userId/record-trade')
  async recordTrade(
    @Param('userId') userId: string,
    @Body('tradeVolume') tradeVolume: number
  ) {
    await this.loyaltyService.recordTrade(userId, tradeVolume);
    return { success: true };
  }

  @Post('users/:userId/record-deposit')
  async recordDeposit(
    @Param('userId') userId: string,
    @Body('amount') amount: number
  ) {
    await this.loyaltyService.recordDeposit(userId, amount);
    return { success: true };
  }

  @Post('users/:userId/record-login')
  async recordLogin(@Param('userId') userId: string) {
    await this.loyaltyService.recordLogin(userId);
    return { success: true };
  }

  // Special Rewards
  @Post('process-birthday-rewards')
  async processBirthdayRewards() {
    await this.loyaltyService.processBirthdayRewards();
    return { success: true, message: 'Birthday rewards processed' };
  }

  @Post('process-anniversary-rewards')
  async processAnniversaryRewards() {
    await this.loyaltyService.processAnniversaryRewards();
    return { success: true, message: 'Anniversary rewards processed' };
  }

  // Transaction History
  @Get('users/:userId/transactions')
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.loyaltyService.getTransactionHistory(
      userId,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0
    );
  }
}
