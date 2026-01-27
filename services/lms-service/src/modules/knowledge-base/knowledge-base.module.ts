import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseArticle } from '../../entities';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseResolver } from './knowledge-base.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBaseArticle])],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeBaseResolver],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
