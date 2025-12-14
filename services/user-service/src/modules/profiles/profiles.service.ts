import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/profile.entity';

export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  avatarUrl?: string;
  bio?: string;
  preferences?: Record<string, unknown>;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  /**
   * Create profile for user
   */
  async create(userId: string): Promise<UserProfile> {
    const profile = this.profileRepository.create({ userId });
    return this.profileRepository.save(profile);
  }

  /**
   * Get profile by user ID
   */
  async findByUserId(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  /**
   * Update profile
   */
  async update(userId: string, updateDto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.findByUserId(userId);
    Object.assign(profile, updateDto);
    return this.profileRepository.save(profile);
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<UserProfile> {
    const profile = await this.findByUserId(userId);
    profile.preferences = { ...profile.preferences, ...preferences };
    return this.profileRepository.save(profile);
  }

  /**
   * Get or create profile
   */
  async getOrCreate(userId: string): Promise<UserProfile> {
    try {
      return await this.findByUserId(userId);
    } catch {
      return this.create(userId);
    }
  }
}
