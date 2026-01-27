import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, Like, Bookmark, Follower } from '../../database/entities';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostResolver } from './post.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Like, Bookmark, Follower])],
  controllers: [PostController],
  providers: [PostService, PostResolver],
  exports: [PostService],
})
export class PostModule {}
