import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment, Like, Post } from '../../database/entities';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentResolver } from './comment.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Like, Post])],
  controllers: [CommentController],
  providers: [CommentService, CommentResolver],
  exports: [CommentService],
})
export class CommentModule {}
