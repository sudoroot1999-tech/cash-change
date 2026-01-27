import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseArticle, ArticleType } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedArticles {
  @Field(() => [KnowledgeBaseArticle]) items: KnowledgeBaseArticle[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => KnowledgeBaseArticle)
export class KnowledgeBaseResolver {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Query(() => PaginatedArticles, { name: 'knowledgeBaseArticles' })
  async findAll(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('category', { nullable: true }) category?: string,
    @Args('type', { type: () => String, nullable: true }) type?: ArticleType,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<PaginatedArticles> {
    return this.kbService.findAll({ page, limit, search }, category, type);
  }

  @Query(() => KnowledgeBaseArticle, { name: 'knowledgeBaseArticle' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<KnowledgeBaseArticle> {
    return this.kbService.findOne(id);
  }

  @Query(() => KnowledgeBaseArticle, { name: 'knowledgeBaseArticleBySlug' })
  async findBySlug(@Args('slug') slug: string): Promise<KnowledgeBaseArticle> {
    return this.kbService.findBySlug(slug);
  }

  @Query(() => [KnowledgeBaseArticle], { name: 'featuredKnowledgeBaseArticles' })
  async getFeatured(): Promise<KnowledgeBaseArticle[]> {
    return this.kbService.getFeatured();
  }

  @Query(() => [String], { name: 'knowledgeBaseCategories' })
  async getCategories(): Promise<string[]> {
    return this.kbService.getCategories();
  }

  @Mutation(() => KnowledgeBaseArticle)
  async markArticleHelpful(
    @Args('id', { type: () => ID }) id: string,
    @Args('helpful') helpful: boolean,
  ): Promise<KnowledgeBaseArticle> {
    return this.kbService.markHelpful(id, helpful);
  }
}
