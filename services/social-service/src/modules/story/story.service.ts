import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Story, StoryType, Like, LikeTargetType, Follower, FollowStatus } from '../../database/entities';

@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(Story)
    private storyRepo: Repository<Story>,
    @InjectRepository(Like)
    private likeRepo: Repository<Like>,
    @InjectRepository(Follower)
    private followerRepo: Repository<Follower>,
  ) {}

  async create(
    authorId: string,
    type: StoryType,
    data: { mediaUrl?: string; content?: string; backgroundColor?: string; textStyle?: any; stickers?: any[]; linkUrl?: string },
  ): Promise<Story> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = this.storyRepo.create({
      authorId,
      type,
      ...data,
      expiresAt,
    });

    return this.storyRepo.save(story);
  }

  async findById(id: string, userId?: string): Promise<Story> {
    const story = await this.storyRepo.findOne({
      where: { id, expiresAt: MoreThan(new Date()) },
      relations: ['author'],
    });

    if (!story) throw new NotFoundException('Story not found or expired');

    if (userId) {
      story.isLiked = await this.isLiked(id, userId);
      if (userId !== story.authorId) {
        await this.storyRepo.increment({ id }, 'viewsCount', 1);
        story.isViewed = true;
      }
    }

    return story;
  }

  async getUserStories(userId: string, viewerId?: string): Promise<Story[]> {
    const stories = await this.storyRepo.find({
      where: { authorId: userId, expiresAt: MoreThan(new Date()) },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    if (viewerId) {
      for (const story of stories) {
        story.isLiked = await this.isLiked(story.id, viewerId);
      }
    }

    return stories;
  }

  async getFeedStories(userId: string) {
    const following = await this.followerRepo.find({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      select: ['followingId'],
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId);

    const stories = await this.storyRepo
      .createQueryBuilder('story')
      .leftJoinAndSelect('story.author', 'author')
      .where('story.authorId IN (:...ids)', { ids: followingIds })
      .andWhere('story.expiresAt > :now', { now: new Date() })
      .orderBy('story.createdAt', 'DESC')
      .getMany();

    // Group by author
    const grouped = new Map<string, Story[]>();
    for (const story of stories) {
      const authorId = story.authorId;
      if (!grouped.has(authorId)) {
        grouped.set(authorId, []);
      }
      grouped.get(authorId)!.push(story);
    }

    return Array.from(grouped.entries()).map(([authorId, stories]) => ({
      userId: authorId,
      user: stories[0].author,
      stories,
    }));
  }

  async delete(id: string, userId: string): Promise<void> {
    const story = await this.storyRepo.findOne({ where: { id } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId !== userId) throw new ForbiddenException('You can only delete your own stories');
    await this.storyRepo.remove(story);
  }

  async like(storyId: string, userId: string): Promise<Story> {
    const story = await this.findById(storyId);
    const existing = await this.likeRepo.findOne({
      where: { userId, targetId: storyId, targetType: LikeTargetType.STORY },
    });

    if (existing) {
      await this.likeRepo.remove(existing);
      await this.storyRepo.decrement({ id: storyId }, 'likesCount', 1);
    } else {
      await this.likeRepo.save({ userId, targetId: storyId, targetType: LikeTargetType.STORY });
      await this.storyRepo.increment({ id: storyId }, 'likesCount', 1);
    }

    return this.findById(storyId, userId);
  }

  private async isLiked(storyId: string, userId: string): Promise<boolean> {
    const like = await this.likeRepo.findOne({
      where: { userId, targetId: storyId, targetType: LikeTargetType.STORY },
    });
    return !!like;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStories() {
    await this.storyRepo.delete({ expiresAt: { $lt: new Date() } as any });
  }
}
