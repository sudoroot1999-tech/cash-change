import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment, Like, LikeTargetType, Post } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    @InjectRepository(Like)
    private likeRepo: Repository<Like>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
  ) {}

  async create(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string,
    mediaUrls?: string[],
    mentions?: string[],
  ): Promise<Comment> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({
      postId,
      authorId,
      content,
      parentId,
      mediaUrls,
      mentions,
    });

    const saved = await this.commentRepo.save(comment);

    // Update counters
    await this.postRepo.increment({ id: postId }, 'commentsCount', 1);
    if (parentId) {
      await this.commentRepo.increment({ id: parentId }, 'repliesCount', 1);
    }

    return this.findById(saved.id, authorId);
  }

  async findById(id: string, userId?: string): Promise<Comment> {
    const comment = await this.commentRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['author', 'parent'],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    if (userId) {
      comment.isLiked = await this.isLiked(id, userId);
    }

    return comment;
  }

  async getPostComments(postId: string, pagination: PaginationDto, userId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentRepo.findAndCount({
      where: { postId, parentId: IsNull(), deletedAt: IsNull() },
      relations: ['author'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    for (const comment of comments) {
      if (userId) comment.isLiked = await this.isLiked(comment.id, userId);
      comment.replies = await this.getReplies(comment.id, userId);
    }

    return { items: comments, meta: createPaginationMeta(page, limit, total) };
  }

  async getReplies(commentId: string, userId?: string): Promise<Comment[]> {
    const replies = await this.commentRepo.find({
      where: { parentId: commentId, deletedAt: IsNull() },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      take: 5,
    });

    for (const reply of replies) {
      if (userId) reply.isLiked = await this.isLiked(reply.id, userId);
    }

    return replies;
  }

  async update(id: string, userId: string, content: string): Promise<Comment> {
    const comment = await this.findById(id);
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = content;
    comment.isEdited = true;
    return this.commentRepo.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.findById(id);
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.update(id, { deletedAt: new Date() });
    await this.postRepo.decrement({ id: comment.postId }, 'commentsCount', 1);
    if (comment.parentId) {
      await this.commentRepo.decrement({ id: comment.parentId }, 'repliesCount', 1);
    }
  }

  async like(commentId: string, userId: string): Promise<Comment> {
    const comment = await this.findById(commentId);
    const existing = await this.likeRepo.findOne({
      where: { userId, targetId: commentId, targetType: LikeTargetType.COMMENT },
    });

    if (existing) {
      await this.likeRepo.remove(existing);
      await this.commentRepo.decrement({ id: commentId }, 'likesCount', 1);
    } else {
      await this.likeRepo.save({ userId, targetId: commentId, targetType: LikeTargetType.COMMENT });
      await this.commentRepo.increment({ id: commentId }, 'likesCount', 1);
    }

    return this.findById(commentId, userId);
  }

  private async isLiked(commentId: string, userId: string): Promise<boolean> {
    const like = await this.likeRepo.findOne({
      where: { userId, targetId: commentId, targetType: LikeTargetType.COMMENT },
    });
    return !!like;
  }
}
