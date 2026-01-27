import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { P2pAd, AdStatus } from '../entities/p2p-ad.entity';
import { CreateAdDto } from '../dto/create-ad.dto';
import { UpdateAdDto } from '../dto/update-ad.dto';
import { SearchAdsDto } from '../dto/search-ads.dto';

@Injectable()
export class AdService {
  constructor(
    @InjectRepository(P2pAd)
    private adRepository: Repository<P2pAd>,
  ) {}

  async createAd(userId: string, dto: CreateAdDto): Promise<P2pAd> {
    // Validate limits
    if (dto.minLimit > dto.maxLimit) {
      throw new BadRequestException('Min limit cannot be greater than max limit');
    }

    const ad = this.adRepository.create({
      ...dto,
      userId,
      blacklist: [],
      status: AdStatus.ACTIVE,
    });

    return this.adRepository.save(ad);
  }

  async updateAd(adId: string, userId: string, dto: UpdateAdDto): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only update your own ads');
    }

    // Validate limits if both are provided
    const minLimit = dto.minLimit ?? ad.minLimit;
    const maxLimit = dto.maxLimit ?? ad.maxLimit;

    if (minLimit > maxLimit) {
      throw new BadRequestException('Min limit cannot be greater than max limit');
    }

    Object.assign(ad, dto);
    return this.adRepository.save(ad);
  }

  async deleteAd(adId: string, userId: string): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only delete your own ads');
    }

    ad.status = AdStatus.DELETED;
    await this.adRepository.save(ad);
  }

  async pauseAd(adId: string, userId: string): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only pause your own ads');
    }

    ad.status = AdStatus.PAUSED;
    return this.adRepository.save(ad);
  }

  async activateAd(adId: string, userId: string): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only activate your own ads');
    }

    ad.status = AdStatus.ACTIVE;
    return this.adRepository.save(ad);
  }

  async searchAds(dto: SearchAdsDto): Promise<{ ads: P2pAd[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'price', sortOrder = 'ASC' } = dto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<P2pAd> = {
      status: AdStatus.ACTIVE,
    };

    if (dto.type) {
      where.type = dto.type;
    }

    if (dto.cryptoAsset) {
      where.cryptoAsset = dto.cryptoAsset;
    }

    if (dto.fiatCurrency) {
      where.fiatCurrency = dto.fiatCurrency;
    }

    const queryBuilder = this.adRepository.createQueryBuilder('ad');
    queryBuilder.where('ad.status = :status', { status: AdStatus.ACTIVE });

    if (dto.type) {
      queryBuilder.andWhere('ad.type = :type', { type: dto.type });
    }

    if (dto.cryptoAsset) {
      queryBuilder.andWhere('ad.cryptoAsset = :cryptoAsset', { cryptoAsset: dto.cryptoAsset });
    }

    if (dto.fiatCurrency) {
      queryBuilder.andWhere('ad.fiatCurrency = :fiatCurrency', { fiatCurrency: dto.fiatCurrency });
    }

    if (dto.paymentMethod) {
      queryBuilder.andWhere('ad.paymentMethods LIKE :paymentMethod', {
        paymentMethod: `%${dto.paymentMethod}%`,
      });
    }

    if (dto.amount) {
      queryBuilder.andWhere('ad.minLimit <= :amount', { amount: dto.amount });
      queryBuilder.andWhere('ad.maxLimit >= :amount', { amount: dto.amount });
      queryBuilder.andWhere('ad.availableAmount > 0');
    }

    if (dto.minPrice !== undefined) {
      queryBuilder.andWhere('ad.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      queryBuilder.andWhere('ad.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    const validSortColumns = ['price', 'createdAt', 'availableAmount', 'completedTrades'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'price';

    queryBuilder.orderBy(`ad.${sortColumn}`, sortOrder);
    queryBuilder.skip(skip);
    queryBuilder.take(limit);

    const [ads, total] = await queryBuilder.getManyAndCount();

    return { ads, total };
  }

  async getAdById(adId: string): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    return ad;
  }

  async getUserAds(userId: string): Promise<P2pAd[]> {
    return this.adRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addToBlacklist(adId: string, userId: string, blockedUserId: string): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only modify your own ads');
    }

    if (!ad.blacklist) {
      ad.blacklist = [];
    }

    if (!ad.blacklist.includes(blockedUserId)) {
      ad.blacklist.push(blockedUserId);
      await this.adRepository.save(ad);
    }

    return ad;
  }

  async removeFromBlacklist(adId: string, userId: string, unblockedUserId: string): Promise<P2pAd> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.userId !== userId) {
      throw new ForbiddenException('You can only modify your own ads');
    }

    if (ad.blacklist) {
      ad.blacklist = ad.blacklist.filter((id) => id !== unblockedUserId);
      await this.adRepository.save(ad);
    }

    return ad;
  }

  async updateAdStats(adId: string, completed: boolean): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (ad) {
      ad.totalTrades += 1;
      if (completed) {
        ad.completedTrades += 1;
      }
      await this.adRepository.save(ad);
    }
  }

  async decreaseAvailableAmount(adId: string, amount: number): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (ad) {
      ad.availableAmount -= amount;
      if (ad.availableAmount < 0) {
        ad.availableAmount = 0;
      }
      await this.adRepository.save(ad);
    }
  }

  async increaseAvailableAmount(adId: string, amount: number): Promise<void> {
    const ad = await this.adRepository.findOne({ where: { id: adId } });

    if (ad) {
      ad.availableAmount += amount;
      await this.adRepository.save(ad);
    }
  }
}
