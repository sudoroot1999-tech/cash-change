import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Post, PostVisibility, Like, LikeTargetType, Bookmark, Follower, FollowStatus } from '../../database/entities';
import { CreatePostDto, UpdatePostDto } from './dto';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Like)
    private likeRepo: Repository<Like>,
    @InjectRepository(Bookmark)
    private bookmarkRepo: Repository<Bookmark>,
    @InjectRepository(Follower)
    private followerRepo: Repository<Follower>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(authorId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({
      authorId,
      ...dto,
    });
    return this.postRepo.save(post);
  }

  async findById(id: string, currentUserId?: string): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author', 'sharedPost', 'sharedPost.author'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (currentUserId) {
      post.isLiked = await this.isLiked(id, currentUserId);
      post.isBookmarked = await this.isBookmarked(id, currentUserId);
    }

    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findById(id);
    
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    Object.assign(post, dto, { isEdited: true });
    return this.postRepo.save(post);
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.findById(id);
    
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepo.update(id, { deletedAt: new Date() });
  }

  async getFeed(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Get users that the current user follows
    const following = await this.followerRepo.find({
      where: { followerId: userId, status: FollowStatus.ACCEPTED },
      select: ['followingId'],
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId); // Include own posts

    const [posts, total] = await this.postRepo.findAndCount({
      where: {
        authorId: In(followingIds),
        deletedAt: IsNull(),
        visibility: In([PostVisibility.PUBLIC, PostVisibility.FOLLOWERS]),
      },
      relations: ['author', 'sharedPost', 'sharedPost.author'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    // Add like/bookmark status
    for (const post of posts) {
      post.isLiked = await this.isLiked(post.id, userId);
      post.isBookmarked = await this.isBookmarked(post.id, userId);
    }

    return {
      items: posts,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getExploreFeed(pagination: PaginationDto, currentUserId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [posts, total] = await this.postRepo.findAndCount({
      where: {
        visibility: PostVisibility.PUBLIC,
        deletedAt: IsNull(),
      },
      relations: ['author', 'sharedPost', 'sharedPost.author'],
      take: limit,
      skip,
      order: { likesCount: 'DESC', createdAt: 'DESC' },
    });

    if (currentUserId) {
      for (const post of posts) {
        post.isLiked = await this.isLiked(post.id, currentUserId);
        post.isBookmarked = await this.isBookmarked(post.id, currentUserId);
      }
    }

    return {
      items: posts,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getUserPosts(userId: string, pagination: PaginationDto, currentUserId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      authorId: userId,
      deletedAt: IsNull(),
    };

    // If not viewing own posts, filter by visibility
    if (currentUserId !== userId) {
      whereCondition.visibility = PostVisibility.PUBLIC;
    }

    const [posts, total] = await this.postRepo.findAndCount({
      where: whereCondition,
      relations: ['author', 'sharedPost', 'sharedPost.author'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    if (currentUserId) {
      for (const post of posts) {
        post.isLiked = await this.isLiked(post.id, currentUserId);
        post.isBookmarked = await this.isBookmarked(post.id, currentUserId);
      }
    }

    return {
      items: posts,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async like(postId: string, userId: string): Promise<Post> {
    const post = await this.findById(postId);
    
    const existingLike = await this.likeRepo.findOne({
      where: { userId, targetId: postId, targetType: LikeTargetType.POST },
    });

    if (existingLike) {
      await this.likeRepo.remove(existingLike);
      await this.postRepo.decrement({ id: postId }, 'likesCount', 1);
    } else {
      await this.likeRepo.save({
        userId,
        targetId: postId,
        targetType: LikeTargetType.POST,
      });
      await this.postRepo.increment({ id: postId }, 'likesCount', 1);
    }

    return this.findById(postId, userId);
  }

  async bookmark(postId: string, userId: string, collectionName?: string): Promise<Post> {
    const post = await this.findById(postId);
    
    const existingBookmark = await this.bookmarkRepo.findOne({
      where: { userId, postId },
    });

    if (existingBookmark) {
      await this.bookmarkRepo.remove(existingBookmark);
      await this.postRepo.decrement({ id: postId }, 'bookmarksCount', 1);
    } else {
      await this.bookmarkRepo.save({ userId, postId, collectionName });
      await this.postRepo.increment({ id: postId }, 'bookmarksCount', 1);
    }

    return this.findById(postId, userId);
  }

  async getBookmarks(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await this.bookmarkRepo.findAndCount({
      where: { userId },
      relations: ['post', 'post.author'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    const posts = bookmarks.map((b) => {
      b.post.isBookmarked = true;
      return b.post;
    });

    return {
      items: posts,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async share(postId: string, userId: string, content?: string): Promise<Post> {
    const originalPost = await this.findById(postId);
    
    const sharedPost = this.postRepo.create({
      authorId: userId,
      type: originalPost.type,
      visibility: PostVisibility.PUBLIC,
      content,
      sharedPostId: postId,
    });

    await this.postRepo.increment({ id: postId }, 'sharesCount', 1);
    return this.postRepo.save(sharedPost);
  }

  async incrementViews(postId: string): Promise<void> {
    await this.postRepo.increment({ id: postId }, 'viewsCount', 1);
  }

  async pin(postId: string, userId: string): Promise<Post> {
    const post = await this.findById(postId);
    
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only pin your own posts');
    }

    // Unpin other posts
    await this.postRepo.update({ authorId: userId, isPinned: true }, { isPinned: false });
    
    post.isPinned = true;
    return this.postRepo.save(post);
  }

  private async isLiked(postId: string, userId: string): Promise<boolean> {
    const like = await this.likeRepo.findOne({
      where: { userId, targetId: postId, targetType: LikeTargetType.POST },
    });
    return !!like;
  }

  private async isBookmarked(postId: string, userId: string): Promise<boolean> {
    const bookmark = await this.bookmarkRepo.findOne({
      where: { userId, postId },
    });
    return !!bookmark;
  }
}
