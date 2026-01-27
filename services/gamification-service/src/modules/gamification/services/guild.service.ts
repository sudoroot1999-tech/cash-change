import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guild, GuildStatus } from '../entities/guild.entity';
import { GuildMember, GuildRole, MembershipStatus } from '../entities/guild-member.entity';
import { LevelService } from './level.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class GuildService {
  constructor(
    @InjectRepository(Guild)
    private guildRepository: Repository<Guild>,
    @InjectRepository(GuildMember)
    private memberRepository: Repository<GuildMember>,
    private levelService: LevelService,
  ) {}

  async createGuild(
    ownerId: string,
    name: string,
    tag: string,
    description: string,
    isPublic: boolean = true,
  ): Promise<Guild> {
    // Check if user already owns a guild
    const existingGuild = await this.guildRepository.findOne({
      where: { ownerId },
    });

    if (existingGuild) {
      throw new BadRequestException('User already owns a guild');
    }

    // Check if name or tag is taken
    const nameExists = await this.guildRepository.findOne({
      where: { name },
    });

    if (nameExists) {
      throw new BadRequestException('Guild name already taken');
    }

    const tagExists = await this.guildRepository.findOne({
      where: { tag },
    });

    if (tagExists) {
      throw new BadRequestException('Guild tag already taken');
    }

    const guild = this.guildRepository.create({
      name,
      tag,
      description,
      ownerId,
      isPublic,
      status: GuildStatus.ACTIVE,
    });

    await this.guildRepository.save(guild);

    // Add owner as member
    const member = this.memberRepository.create({
      guildId: guild.id,
      userId: ownerId,
      role: GuildRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    await this.memberRepository.save(member);

    // Award XP for creating guild
    await this.levelService.addXp(ownerId, 100, XpSource.GUILD_CREATED);

    return guild;
  }

  async getGuild(guildId: string): Promise<Guild> {
    const guild = await this.guildRepository.findOne({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    return guild;
  }

  async getGuilds(isPublic: boolean = true, limit: number = 50) {
    return await this.guildRepository.find({
      where: { isPublic, status: GuildStatus.ACTIVE },
      order: { leaderboardRank: 'ASC', level: 'DESC' },
      take: limit,
    });
  }

  async joinGuild(userId: string, guildId: string): Promise<GuildMember> {
    const guild = await this.getGuild(guildId);

    if (guild.status !== GuildStatus.ACTIVE) {
      throw new BadRequestException('Guild is not active');
    }

    if (guild.memberCount >= guild.maxMembers) {
      throw new BadRequestException('Guild is full');
    }

    // Check if user is already in a guild
    const existingMembership = await this.memberRepository.findOne({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already in a guild');
    }

    const member = this.memberRepository.create({
      guildId,
      userId,
      role: GuildRole.MEMBER,
      status: guild.requiresApproval ? MembershipStatus.PENDING : MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });

    await this.memberRepository.save(member);

    if (!guild.requiresApproval) {
      guild.memberCount++;
      await this.guildRepository.save(guild);
    }

    return member;
  }

  async leaveGuild(userId: string, guildId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { userId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.role === GuildRole.OWNER) {
      throw new BadRequestException('Owner cannot leave guild. Transfer ownership or disband guild.');
    }

    member.status = MembershipStatus.LEFT;
    member.leftAt = new Date();
    await this.memberRepository.save(member);

    const guild = await this.getGuild(guildId);
    guild.memberCount--;
    await this.guildRepository.save(guild);
  }

  async kickMember(requesterId: string, guildId: string, userId: string): Promise<void> {
    const requester = await this.memberRepository.findOne({
      where: { userId: requesterId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!requester || ![GuildRole.OWNER, GuildRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const member = await this.memberRepository.findOne({
      where: { userId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === GuildRole.OWNER) {
      throw new BadRequestException('Cannot kick guild owner');
    }

    member.status = MembershipStatus.KICKED;
    member.leftAt = new Date();
    await this.memberRepository.save(member);

    const guild = await this.getGuild(guildId);
    guild.memberCount--;
    await this.guildRepository.save(guild);
  }

  async promoteMember(requesterId: string, guildId: string, userId: string, newRole: GuildRole): Promise<void> {
    const requester = await this.memberRepository.findOne({
      where: { userId: requesterId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!requester || requester.role !== GuildRole.OWNER) {
      throw new ForbiddenException('Only owner can promote members');
    }

    const member = await this.memberRepository.findOne({
      where: { userId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (newRole === GuildRole.OWNER) {
      throw new BadRequestException('Use transferOwnership to transfer ownership');
    }

    member.role = newRole;
    await this.memberRepository.save(member);
  }

  async transferOwnership(currentOwnerId: string, guildId: string, newOwnerId: string): Promise<void> {
    const guild = await this.getGuild(guildId);

    if (guild.ownerId !== currentOwnerId) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    const newOwner = await this.memberRepository.findOne({
      where: { userId: newOwnerId, guildId, status: MembershipStatus.ACTIVE },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner must be a guild member');
    }

    // Update old owner to admin
    const oldOwner = await this.memberRepository.findOne({
      where: { userId: currentOwnerId, guildId },
    });
    
    if (!oldOwner) {
      throw new NotFoundException('Old owner membership not found');
    }
    
    oldOwner.role = GuildRole.ADMIN;
    await this.memberRepository.save(oldOwner);

    // Update new owner
    newOwner.role = GuildRole.OWNER;
    await this.memberRepository.save(newOwner);

    guild.ownerId = newOwnerId;
    await this.guildRepository.save(guild);
  }

  async disbandGuild(ownerId: string, guildId: string): Promise<void> {
    const guild = await this.getGuild(guildId);

    if (guild.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can disband guild');
    }

    guild.status = GuildStatus.DISBANDED;
    await this.guildRepository.save(guild);

    // Update all members
    await this.memberRepository.update(
      { guildId, status: MembershipStatus.ACTIVE },
      { status: MembershipStatus.LEFT, leftAt: new Date() },
    );
  }

  async getGuildMembers(guildId: string) {
    return await this.memberRepository.find({
      where: { guildId, status: MembershipStatus.ACTIVE },
      order: { role: 'ASC', contributionXp: 'DESC' },
    });
  }

  async getUserGuild(userId: string): Promise<Guild | null> {
    const member = await this.memberRepository.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['guild'],
    });

    return member?.guild || null;
  }

  async addGuildContribution(userId: string, xp: number, volume: number): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
    });

    if (!member) return;

    member.contributionXp += xp;
    member.contributionVolume += volume;
    member.lastActive = new Date();
    await this.memberRepository.save(member);

    const guild = await this.getGuild(member.guildId);
    guild.totalXpEarned += xp;
    guild.totalTradingVolume += volume;
    
    // Check level up
    const xpForNextLevel = guild.level * 1000;
    if (guild.totalXpEarned >= xpForNextLevel) {
      guild.level++;
      guild.maxMembers += 5; // Increase member capacity
    }

    await this.guildRepository.save(guild);
  }

  async getGuildLeaderboard(limit: number = 100) {
    return await this.guildRepository.find({
      where: { status: GuildStatus.ACTIVE },
      order: {
        totalXpEarned: 'DESC',
        level: 'DESC',
      },
      take: limit,
    });
  }

  async updateGuild(ownerId: string, guildId: string, updates: Partial<Guild>): Promise<Guild> {
    const guild = await this.getGuild(guildId);

    if (guild.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can update guild');
    }

    // Prevent updating critical fields
    delete updates.id;
    delete updates.ownerId;
    delete updates.memberCount;
    delete updates.level;

    Object.assign(guild, updates);
    return await this.guildRepository.save(guild);
  }
}
