import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Channel, ChannelType, ChannelCategory, ChannelSubscriber, ChannelPost, ChannelPostType } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelSubscriber)
    private subscriberRepo: Repository<ChannelSubscriber>,
    @InjectRepository(ChannelPost)
    private postRepo: Repository<ChannelPost>,
  ) {}

  async create(ownerId: string, data: { name: string; handle: string; description?: string; avatarUrl?: string; coverImageUrl?: string; type?: ChannelType; category?: ChannelCategory; rules?: string[] }): Promise<Channel> {
    const existing = await this.channelRepo.findOne({ where: { handle: data.handle } });
    if (existing) throw new ConflictException('Channel handle already taken');

    const channel = this.channelRepo.create({ ownerId, ...data, subscribersCount: 1 });
    const saved = await this.channelRepo.save(channel);

    await this.subscriberRepo.save({ userId: ownerId, channelId: saved.id });
    return saved;
  }

  async findById(id: string, userId?: string): Promise<Channel> {
    const channel = await this.channelRepo.findOne({ where: { id }, relations: ['owner'] });
    if (!channel) throw new NotFoundException('Channel not found');
    if (userId) channel.isSubscribed = await this.isSubscribed(id, userId);
    return channel;
  }

  async findByHandle(handle: string, userId?: string): Promise<Channel> {
    const channel = await this.channelRepo.findOne({ where: { handle }, relations: ['owner'] });
    if (!channel) throw new NotFoundException('Channel not found');
    if (userId) channel.isSubscribed = await this.isSubscribed(channel.id, userId);
    return channel;
  }

  async update(id: string, userId: string, updates: Partial<Channel>): Promise<Channel> {
    const channel = await this.findById(id);
    if (channel.ownerId !== userId) throw new ForbiddenException('Only owner can update channel');
    Object.assign(channel, updates);
    return this.channelRepo.save(channel);
  }

  async delete(id: string, userId: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel.ownerId !== userId) throw new ForbiddenException('Only owner can delete channel');
    await this.channelRepo.remove(channel);
  }

  async subscribe(channelId: string, userId: string): Promise<void> {
    const channel = await this.findById(channelId);
    const existing = await this.subscriberRepo.findOne({ where: { channelId, userId } });
    if (existing) throw new ConflictException('Already subscribed');

    await this.subscriberRepo.save({ userId, channelId });
    await this.channelRepo.increment({ id: channelId }, 'subscribersCount', 1);
  }

  async unsubscribe(channelId: string, userId: string): Promise<void> {
    const channel = await this.findById(channelId);
    if (channel.ownerId === userId) throw new ForbiddenException('Owner cannot unsubscribe');

    const sub = await this.subscriberRepo.findOne({ where: { channelId, userId } });
    if (!sub) throw new NotFoundException('Not subscribed');

    await this.subscriberRepo.remove(sub);
    await this.channelRepo.decrement({ id: channelId }, 'subscribersCount', 1);
  }

  async getSubscribers(channelId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [subs, total] = await this.subscriberRepo.findAndCount({
      where: { channelId },
      relations: ['user'],
      take: limit,
      skip: (page - 1) * limit,
      order: { subscribedAt: 'DESC' },
    });
    return { items: subs.map((s) => s.user), meta: createPaginationMeta(page, limit, total) };
  }

  async getUserChannels(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [subs, total] = await this.subscriberRepo.findAndCount({
      where: { userId },
      relations: ['channel', 'channel.owner'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items: subs.map((s) => ({ ...s.channel, isSubscribed: true })), meta: createPaginationMeta(page, limit, total) };
  }

  async searchChannels(query: string, pagination: PaginationDto, userId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const [channels, total] = await this.channelRepo.findAndCount({
      where: [{ name: ILike(`%${query}%`) }, { handle: ILike(`%${query}%`) }],
      relations: ['owner'],
      take: limit,
      skip: (page - 1) * limit,
      order: { subscribersCount: 'DESC' },
    });
    if (userId) for (const ch of channels) ch.isSubscribed = await this.isSubscribed(ch.id, userId);
    return { items: channels, meta: createPaginationMeta(page, limit, total) };
  }

  async createPost(channelId: string, authorId: string, data: { type?: ChannelPostType; content?: string; mediaUrls?: string[]; signalData?: any; pollData?: any }): Promise<ChannelPost> {
    const channel = await this.findById(channelId);
    if (channel.ownerId !== authorId) {
      const sub = await this.subscriberRepo.findOne({ where: { channelId, userId: authorId } });
      if (!sub) throw new ForbiddenException('Must be subscribed to post');
    }

    const post = this.postRepo.create({ channelId, authorId, ...data });
    const saved = await this.postRepo.save(post);
    await this.channelRepo.increment({ id: channelId }, 'postsCount', 1);
    return saved;
  }

  async getChannelPosts(channelId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [posts, total] = await this.postRepo.findAndCount({
      where: { channelId, deletedAt: null as any },
      relations: ['author', 'channel'],
      take: limit,
      skip: (page - 1) * limit,
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
    return { items: posts, meta: createPaginationMeta(page, limit, total) };
  }

  private async isSubscribed(channelId: string, userId: string): Promise<boolean> {
    const sub = await this.subscriberRepo.findOne({ where: { channelId, userId } });
    return !!sub;
  }
}
