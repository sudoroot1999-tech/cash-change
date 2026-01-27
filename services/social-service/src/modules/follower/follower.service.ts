import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follower, FollowStatus, UserProfile } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class FollowerService {
  constructor(
    @InjectRepository(Follower)
    private followerRepo: Repository<Follower>,
    @InjectRepository(UserProfile)
    private userProfileRepo: Repository<UserProfile>,
  ) {}

  async follow(followerId: string, followingId: string): Promise<Follower> {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.userProfileRepo.findOne({ where: { userId: followingId } });
    if (!targetUser) throw new NotFoundException('User not found');

    const existing = await this.followerRepo.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      if (existing.status === FollowStatus.BLOCKED) {
        throw new ConflictException('You are blocked by this user');
      }
      throw new ConflictException('Already following this user');
    }

    const status = targetUser.isPublic ? FollowStatus.ACCEPTED : FollowStatus.PENDING;

    const follow = this.followerRepo.create({
      followerId,
      followingId,
      status,
    });

    const saved = await this.followerRepo.save(follow);

    if (status === FollowStatus.ACCEPTED) {
      await this.userProfileRepo.increment({ userId: followerId }, 'followingCount', 1);
      await this.userProfileRepo.increment({ userId: followingId }, 'followersCount', 1);
    }

    return saved;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId },
    });

    if (!follow) throw new NotFoundException('Not following this user');

    await this.followerRepo.remove(follow);

    if (follow.status === FollowStatus.ACCEPTED) {
      await this.userProfileRepo.decrement({ userId: followerId }, 'followingCount', 1);
      await this.userProfileRepo.decrement({ userId: followingId }, 'followersCount', 1);
    }
  }

  async acceptFollowRequest(userId: string, followerId: string): Promise<Follower> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId: userId, status: FollowStatus.PENDING },
    });

    if (!follow) throw new NotFoundException('Follow request not found');

    follow.status = FollowStatus.ACCEPTED;
    const saved = await this.followerRepo.save(follow);

    await this.userProfileRepo.increment({ userId: followerId }, 'followingCount', 1);
    await this.userProfileRepo.increment({ userId }, 'followersCount', 1);

    return saved;
  }

  async rejectFollowRequest(userId: string, followerId: string): Promise<void> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId: userId, status: FollowStatus.PENDING },
    });

    if (!follow) throw new NotFoundException('Follow request not found');
    await this.followerRepo.remove(follow);
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    // Remove any existing follow relationship
    await this.followerRepo.delete({ followerId: blockedUserId, followingId: userId });
    await this.followerRepo.delete({ followerId: userId, followingId: blockedUserId });

    // Create block record
    await this.followerRepo.save({
      followerId: blockedUserId,
      followingId: userId,
      status: FollowStatus.BLOCKED,
    });
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await this.followerRepo.delete({
      followerId: blockedUserId,
      followingId: userId,
      status: FollowStatus.BLOCKED,
    });
  }

  async getFollowers(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [followers, total] = await this.followerRepo.findAndCount({
      where: { followingId: userId, status: FollowStatus.ACCEPTED },
      relations: ['follower'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    return {
      items: followers.map((f) => f.follower),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getFollowing(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [following, total] = await this.followerRepo.findAndCount({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      relations: ['following'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    return {
      items: following.map((f) => f.following),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getPendingRequests(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [requests, total] = await this.followerRepo.findAndCount({
      where: { followingId: userId, status: FollowStatus.PENDING },
      relations: ['follower'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    return {
      items: requests.map((r) => r.follower),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId, status: FollowStatus.ACCEPTED },
    });
    return !!follow;
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus | null> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId },
    });
    return follow?.status || null;
  }

  async toggleNotifications(followerId: string, followingId: string): Promise<Follower> {
    const follow = await this.followerRepo.findOne({
      where: { followerId, followingId, status: FollowStatus.ACCEPTED },
    });

    if (!follow) throw new NotFoundException('Not following this user');

    follow.notificationsEnabled = !follow.notificationsEnabled;
    return this.followerRepo.save(follow);
  }
}
