import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SaleRound, SaleStatus, SaleType } from '../entities/sale-round.entity';
import { CreateSaleRoundDto } from '../dto/create-sale-round.dto';
import { SaleRoundQueryDto } from '../dto/query.dto';
import { ProjectService } from './project.service';
import { ProjectStatus } from '../entities/launchpad-project.entity';

@Injectable()
export class SaleRoundService {
  constructor(
    @InjectRepository(SaleRound)
    private readonly saleRoundRepository: Repository<SaleRound>,
    private readonly projectService: ProjectService,
  ) {}

  async create(createSaleRoundDto: CreateSaleRoundDto): Promise<SaleRound> {
    // Validate project exists and is approved
    const project = await this.projectService.findOne(createSaleRoundDto.projectId);

    if (project.status !== ProjectStatus.APPROVED && project.status !== ProjectStatus.LIVE) {
      throw new BadRequestException('Project must be approved before creating sale rounds');
    }

    // Validate dates
    const { whitelistStartTime, whitelistEndTime, saleStartTime, saleEndTime } = createSaleRoundDto;

    if (whitelistEndTime <= whitelistStartTime) {
      throw new BadRequestException('Whitelist end time must be after start time');
    }

    if (saleStartTime <= whitelistEndTime) {
      throw new BadRequestException('Sale start time must be after whitelist end time');
    }

    if (saleEndTime <= saleStartTime) {
      throw new BadRequestException('Sale end time must be after start time');
    }

    // Validate hard cap > soft cap
    if (parseFloat(createSaleRoundDto.hardCap) <= parseFloat(createSaleRoundDto.softCap)) {
      throw new BadRequestException('Hard cap must be greater than soft cap');
    }

    // Validate min/max allocation
    if (parseFloat(createSaleRoundDto.maxAllocation) < parseFloat(createSaleRoundDto.minAllocation)) {
      throw new BadRequestException('Max allocation must be greater than min allocation');
    }

    const saleRound = this.saleRoundRepository.create({
      ...createSaleRoundDto,
      status: SaleStatus.UPCOMING,
    });

    return this.saleRoundRepository.save(saleRound);
  }

  async findAll(query: SaleRoundQueryDto): Promise<{ data: SaleRound[]; total: number }> {
    const { page = 1, limit = 10, status, projectId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.saleRoundRepository.createQueryBuilder('saleRound');

    if (status) {
      queryBuilder.andWhere('saleRound.status = :status', { status });
    }

    if (projectId) {
      queryBuilder.andWhere('saleRound.projectId = :projectId', { projectId });
    }

    queryBuilder
      .leftJoinAndSelect('saleRound.project', 'project')
      .orderBy('saleRound.saleStartTime', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<SaleRound> {
    const saleRound = await this.saleRoundRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!saleRound) {
      throw new NotFoundException('Sale round not found');
    }

    return saleRound;
  }

  async updateStatus(id: string, status: SaleStatus): Promise<SaleRound> {
    const saleRound = await this.findOne(id);
    saleRound.status = status;
    return this.saleRoundRepository.save(saleRound);
  }

  async getCurrentPrice(id: string): Promise<string> {
    const saleRound = await this.findOne(id);

    if (saleRound.saleType === SaleType.DUTCH_AUCTION && saleRound.dutchAuctionConfig) {
      const now = new Date();
      const saleStart = new Date(saleRound.saleStartTime);
      
      if (now < saleStart) {
        return saleRound.dutchAuctionConfig.startPrice;
      }

      const elapsedSeconds = Math.floor((now.getTime() - saleStart.getTime()) / 1000);
      const intervals = Math.floor(elapsedSeconds / saleRound.dutchAuctionConfig.priceDecreaseInterval);
      
      const startPrice = parseFloat(saleRound.dutchAuctionConfig.startPrice);
      const endPrice = parseFloat(saleRound.dutchAuctionConfig.endPrice);
      const decreaseAmount = parseFloat(saleRound.dutchAuctionConfig.priceDecreaseAmount);
      
      const currentPrice = Math.max(startPrice - (intervals * decreaseAmount), endPrice);
      
      return currentPrice.toString();
    }

    return saleRound.tokenPrice;
  }

  async incrementWhitelistCount(id: string): Promise<void> {
    await this.saleRoundRepository.update(id, {
      whitelistCount: () => 'whitelist_count + 1',
    });
  }

  async incrementParticipantCount(id: string): Promise<void> {
    await this.saleRoundRepository.update(id, {
      participantCount: () => 'participant_count + 1',
    });
  }

  async updateSalesData(
    id: string,
    tokensSold: string,
    totalRaised: string,
  ): Promise<SaleRound> {
    const saleRound = await this.findOne(id);
    
    saleRound.tokensSold = tokensSold;
    saleRound.totalRaised = totalRaised;

    // Check if oversubscribed
    if (parseFloat(totalRaised) >= parseFloat(saleRound.hardCap)) {
      saleRound.isOversubscribed = true;
    }

    return this.saleRoundRepository.save(saleRound);
  }

  async checkAndUpdateStatuses(): Promise<void> {
    const now = new Date();

    // Update to WHITELIST_OPEN
    await this.saleRoundRepository.update(
      {
        status: SaleStatus.UPCOMING,
        whitelistStartTime: LessThan(now),
      },
      { status: SaleStatus.WHITELIST_OPEN },
    );

    // Update to WHITELIST_CLOSED
    await this.saleRoundRepository.update(
      {
        status: SaleStatus.WHITELIST_OPEN,
        whitelistEndTime: LessThan(now),
      },
      { status: SaleStatus.WHITELIST_CLOSED },
    );

    // Update to SALE_LIVE
    await this.saleRoundRepository.update(
      {
        status: SaleStatus.WHITELIST_CLOSED,
        saleStartTime: LessThan(now),
      },
      { status: SaleStatus.SALE_LIVE },
    );

    // Update to SALE_ENDED
    await this.saleRoundRepository.update(
      {
        status: SaleStatus.SALE_LIVE,
        saleEndTime: LessThan(now),
      },
      { status: SaleStatus.SALE_ENDED },
    );
  }

  async getActiveSales(): Promise<SaleRound[]> {
    return this.saleRoundRepository.find({
      where: { status: SaleStatus.SALE_LIVE },
      relations: ['project'],
    });
  }

  async getUpcomingSales(): Promise<SaleRound[]> {
    return this.saleRoundRepository.find({
      where: [
        { status: SaleStatus.UPCOMING },
        { status: SaleStatus.WHITELIST_OPEN },
        { status: SaleStatus.WHITELIST_CLOSED },
      ],
      relations: ['project'],
      order: { saleStartTime: 'ASC' },
      take: 10,
    });
  }

  async getStats(projectId?: string): Promise<any> {
    const queryBuilder = this.saleRoundRepository.createQueryBuilder('saleRound');

    if (projectId) {
      queryBuilder.where('saleRound.projectId = :projectId', { projectId });
    }

    const [total, upcoming, live, ended] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('saleRound.status = :status', { status: SaleStatus.UPCOMING }).getCount(),
      queryBuilder.clone().andWhere('saleRound.status = :status', { status: SaleStatus.SALE_LIVE }).getCount(),
      queryBuilder.clone().andWhere('saleRound.status = :status', { status: SaleStatus.SALE_ENDED }).getCount(),
    ]);

    const totalRaisedResult = await queryBuilder
      .select('SUM(CAST(saleRound.totalRaised AS DECIMAL))', 'totalRaised')
      .getRawOne();

    return {
      total,
      byStatus: {
        upcoming,
        live,
        ended,
      },
      totalRaised: totalRaisedResult?.totalRaised || 0,
    };
  }
}
