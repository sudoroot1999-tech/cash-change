import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { UserProfile, UserStatus, Post, PostVisibility, Channel } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
  CHANNELS = 'channels',
  HASHTAGS = 'hashtags',
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(UserProfile)
    private userRepo: Repository<UserProfile>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Channel)
    private channelRepo: Repository<Channel>,
  ) {}

  async search(query: string, type: SearchType, pagination: PaginationDto) {
    switch (type) {
      case SearchType.USERS: return this.searchUsers(query, pagination);
      case SearchType.POSTS: return this.searchPosts(query, pagination);
      case SearchType.CHANNELS: return this.searchChannels(query, pagination);
      case SearchType.HASHTAGS: return this.searchByHashtag(query, pagination);
      default: return this.searchAll(query, pagination);
    }
  }

  async searchAll(query: string, pagination: PaginationDto) {
    const [users, posts, channels] = await Promise.all([
      this.searchUsers(query, { page: 1, limit: 5 }),
      this.searchPosts(query, { page: 1, limit: 5 }),
      this.searchChannels(query, { page: 1, limit: 5 }),
    ]);
    return { users: users.items, posts: posts.items, channels: channels.items };
  }

  async searchUsers(query: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [users, total] = await this.userRepo.findAndCount({
      where: [
        { username: ILike(`%${query}%`), status: UserStatus.ACTIVE },
        { displayName: ILike(`%${query}%`), status: UserStatus.ACTIVE },
      ],
      take: limit,
      skip: (page - 1) * limit,
      order: { followersCount: 'DESC' },
    });
    return { items: users, meta: createPaginationMeta(page, limit, total) };
  }

  async searchPosts(query: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [posts, total] = await this.postRepo.findAndCount({
      where: { content: ILike(`%${query}%`), visibility: PostVisibility.PUBLIC, deletedAt: IsNull() },
      relations: ['author'],
      take: limit,
      skip: (page - 1) * limit,
      order: { likesCount: 'DESC', createdAt: 'DESC' },
    });
    return { items: posts, meta: createPaginationMeta(page, limit, total) };
  }

  async searchChannels(query: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [channels, total] = await this.channelRepo.findAndCount({
      where: [{ name: ILike(`%${query}%`) }, { handle: ILike(`%${query}%`) }, { description: ILike(`%${query}%`) }],
      relations: ['owner'],
      take: limit,
      skip: (page - 1) * limit,
      order: { subscribersCount: 'DESC' },
    });
    return { items: channels, meta: createPaginationMeta(page, limit, total) };
  }

  async searchByHashtag(hashtag: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    
    const [posts, total] = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC })
      .andWhere('post.deletedAt IS NULL')
      .andWhere(':tag = ANY(post.hashtags)', { tag })
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return { items: posts, meta: createPaginationMeta(page, limit, total) };
  }

  async getTrendingHashtags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
    const result = await this.postRepo
      .createQueryBuilder('post')
      .select('unnest(post.hashtags)', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('post.visibility = :visibility', { visibility: PostVisibility.PUBLIC })
      .andWhere('post.deletedAt IS NULL')
      .andWhere('post.createdAt > :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }
}
