import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LearningPathService } from './learning-path.service';
import { LearningPath, UserLearningPath } from '../../database/entities';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedLearningPaths {
  @Field(() => [LearningPath]) items: LearningPath[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => LearningPath)
export class LearningPathResolver {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Mutation(() => LearningPath)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createLearningPath(@Args('input') createDto: CreateLearningPathDto): Promise<LearningPath> {
    return this.learningPathService.create(createDto);
  }

  @Query(() => PaginatedLearningPaths, { name: 'learningPaths' })
  async findAll(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<PaginatedLearningPaths> {
    return this.learningPathService.findAll({ page, limit, search });
  }

  @Query(() => LearningPath, { name: 'learningPath' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<LearningPath> {
    return this.learningPathService.findOne(id);
  }

  @Query(() => [LearningPath], { name: 'featuredLearningPaths' })
  async getFeatured(): Promise<LearningPath[]> {
    return this.learningPathService.getFeatured();
  }

  @Query(() => [UserLearningPath], { name: 'myLearningPaths' })
  @UseGuards(JwtAuthGuard)
  async getMyLearningPaths(@CurrentUser('userId') userId: string): Promise<UserLearningPath[]> {
    return this.learningPathService.getUserLearningPaths(userId);
  }

  @Mutation(() => UserLearningPath)
  @UseGuards(JwtAuthGuard)
  async enrollLearningPath(
    @Args('learningPathId', { type: () => ID }) learningPathId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserLearningPath> {
    return this.learningPathService.enroll(userId, learningPathId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteLearningPath(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.learningPathService.remove(id);
    return true;
  }
}
