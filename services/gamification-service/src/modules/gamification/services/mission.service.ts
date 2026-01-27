import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mission, MissionType, MissionCategory } from '../entities/mission.entity';
import { UserMission, MissionStatus } from '../entities/user-mission.entity';
import { LevelService } from './level.service';
import { XpSource } from '../entities/xp-transaction.entity';
import { RewardService } from './reward.service';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(UserMission)
    private readonly userMissionRepository: Repository<UserMission>,
    private readonly rewardService: RewardService,
  ) {}

  async getUserMissions(userId: string, type?: MissionType): Promise<UserMission[]> {
    const where: any = { userId };
    
    if (type) {
      const missions = await this.missionRepository.find({
        where: { type, isActive: true },
      });
      
      const missionIds = missions.map(m => m.id);
      where.missionId = missionIds.length > 0 ? missionIds : ['none'];
    }

    return this.userMissionRepository.find({
      where,
      relations: ['mission'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDailyMissions(userId: string): Promise<UserMission[]> {
    return this.getUserMissions(userId, MissionType.DAILY);
  }

  async updateMissionProgress(
    userId: string,
    missionCode: string,
    progressAmount: number,
  ): Promise<UserMission> {
    const mission = await this.missionRepository.findOne({
      where: { code: missionCode, isActive: true },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    let userMission = await this.userMissionRepository.findOne({
      where: { userId, missionId: mission.id },
      relations: ['mission'],
    });

    if (!userMission) {
      // Create new user mission
      const expiresAt = this.calculateExpirationDate(mission.type);
      
      userMission = this.userMissionRepository.create({
        userId,
        missionId: mission.id,
        progress: 0,
        status: MissionStatus.IN_PROGRESS,
        startedAt: new Date(),
        expiresAt,
      });
    }

    // Check if mission expired
    if (userMission.expiresAt && new Date() > userMission.expiresAt) {
      userMission.status = MissionStatus.EXPIRED;
      await this.userMissionRepository.save(userMission);
      throw new BadRequestException('Mission has expired');
    }

    // Update progress
    userMission.progress += progressAmount;
    userMission.status = MissionStatus.IN_PROGRESS;

    if (userMission.startedAt === null) {
      userMission.startedAt = new Date();
    }

    // Check if completed
    if (userMission.progress >= mission.targetValue) {
      userMission.progress = mission.targetValue;
      userMission.status = MissionStatus.COMPLETED;
      userMission.completedAt = new Date();
      this.logger.log(`Mission ${missionCode} completed by user ${userId}`);
    }

    return this.userMissionRepository.save(userMission);
  }

  async claimMission(userId: string, missionId: string): Promise<UserMission> {
    const userMission = await this.userMissionRepository.findOne({
      where: { userId, missionId },
      relations: ['mission'],
    });

    if (!userMission) {
      throw new NotFoundException('Mission not found');
    }

    if (userMission.status === MissionStatus.CLAIMED) {
      throw new BadRequestException('Mission already claimed');
    }

    if (userMission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException('Mission not completed yet');
    }

    // Claim rewards
    const mission = userMission.mission;

    if (mission.tokenReward > 0) {
      await this.rewardService.createReward({
        userId,
        type: 'TOKEN',
        title: `${mission.title} Reward`,
        description: mission.description,
        amount: mission.tokenReward,
        sourceType: 'mission',
        sourceId: mission.id,
      });
    }

    userMission.status = MissionStatus.CLAIMED;
    userMission.claimedAt = new Date();

    return this.userMissionRepository.save(userMission);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyMissions(): Promise<void> {
    this.logger.log('Resetting daily missions');

    // Expire uncompleted daily missions
    await this.userMissionRepository
      .createQueryBuilder()
      .update()
      .set({ status: MissionStatus.EXPIRED })
      .where('status IN (:...statuses)', {
        statuses: [MissionStatus.NOT_STARTED, MissionStatus.IN_PROGRESS],
      })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();

    this.logger.log('Daily missions reset complete');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async resetWeeklyMissions(): Promise<void> {
    this.logger.log('Resetting weekly missions');

    const weeklyMissions = await this.missionRepository.find({
      where: { type: MissionType.WEEKLY, isActive: true },
    });

    for (const mission of weeklyMissions) {
      await this.userMissionRepository
        .createQueryBuilder()
        .update()
        .set({ status: MissionStatus.EXPIRED })
        .where('missionId = :missionId', { missionId: mission.id })
        .andWhere('status IN (:...statuses)', {
          statuses: [MissionStatus.NOT_STARTED, MissionStatus.IN_PROGRESS],
        })
        .execute();
    }

    this.logger.log('Weekly missions reset complete');
  }

  private calculateExpirationDate(type: MissionType): Date {
    const now = new Date();
    
    switch (type) {
      case MissionType.DAILY:
        now.setDate(now.getDate() + 1);
        now.setHours(0, 0, 0, 0);
        return now;
      
      case MissionType.WEEKLY:
        now.setDate(now.getDate() + (7 - now.getDay()));
        now.setHours(0, 0, 0, 0);
        return now;
      
      case MissionType.MONTHLY:
        now.setMonth(now.getMonth() + 1, 1);
        now.setHours(0, 0, 0, 0);
        return now;
      
      default:
        return null;
    }
  }

  async initializeDefaultMissions(): Promise<void> {
    const defaultMissions = [
      {
        code: 'DAILY_LOGIN',
        title: 'Daily Login',
        description: 'Login to the platform',
        type: MissionType.DAILY,
        category: MissionCategory.LOGIN,
        targetValue: 1,
        xpReward: 10,
        tokenReward: 1,
      },
      {
        code: 'DAILY_TRADE',
        title: 'Make a Trade',
        description: 'Complete at least one trade today',
        type: MissionType.DAILY,
        category: MissionCategory.TRADING,
        targetValue: 1,
        xpReward: 25,
        tokenReward: 2,
      },
      {
        code: 'DAILY_VOLUME_100',
        title: 'Trade $100 Volume',
        description: 'Trade at least $100 in volume today',
        type: MissionType.DAILY,
        category: MissionCategory.TRADING,
        targetValue: 100,
        xpReward: 50,
        tokenReward: 5,
      },
      {
        code: 'WEEKLY_TRADES_10',
        title: 'Complete 10 Trades',
        description: 'Complete 10 trades this week',
        type: MissionType.WEEKLY,
        category: MissionCategory.TRADING,
        targetValue: 10,
        xpReward: 100,
        tokenReward: 10,
      },
      {
        code: 'WEEKLY_REFERRAL',
        title: 'Refer a Friend',
        description: 'Invite a friend to join the platform',
        type: MissionType.WEEKLY,
        category: MissionCategory.REFERRAL,
        targetValue: 1,
        xpReward: 200,
        tokenReward: 20,
      },
    ];

    for (const missionData of defaultMissions) {
      const exists = await this.missionRepository.findOne({
        where: { code: missionData.code },
      });

      if (!exists) {
        const mission = this.missionRepository.create(missionData);
        await this.missionRepository.save(mission);
        this.logger.log(`Created mission: ${missionData.code}`);
      }
    }
  }
}
