import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogPost } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedBlogPosts {
  @Field(() => [BlogPost]) items: BlogPost[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => BlogPost)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => PaginatedBlogPosts, { name: 'blogPosts' })
  async findAll(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('category', { nullable: true }) category?: string,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<PaginatedBlogPosts> {
    return this.blogService.findAll({ page, limit, search }, category);
  }

  @Query(() => BlogPost, { name: 'blogPost' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<BlogPost> {
    return this.blogService.findOne(id);
  }

  @Query(() => BlogPost, { name: 'blogPostBySlug' })
  async findBySlug(@Args('slug') slug: string): Promise<BlogPost> {
    return this.blogService.findBySlug(slug);
  }

  @Query(() => [BlogPost], { name: 'featuredBlogPosts' })
  async getFeatured(): Promise<BlogPost[]> {
    return this.blogService.getFeatured();
  }

  @Query(() => [String], { name: 'blogCategories' })
  async getCategories(): Promise<string[]> {
    return this.blogService.getCategories();
  }

  @Mutation(() => BlogPost)
  @UseGuards(JwtAuthGuard)
  async likeBlogPost(@Args('id', { type: () => ID }) id: string): Promise<BlogPost> {
    return this.blogService.like(id);
  }
}
