import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserProfile } from '../../database/entities';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedUsers {
  @Field(() => [UserProfile])
  items: UserProfile[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => UserProfile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => UserProfile, { name: 'me' })
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser('userId') userId: string) {
    return this.userService.findByUserId(userId);
  }

  @Query(() => UserProfile, { name: 'userByUsername' })
  getUserByUsername(@Args('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @Query(() => UserProfile, { name: 'userById' })
  getUserById(@Args('userId', { type: () => ID }) userId: string) {
    return this.userService.findByUserId(userId);
  }

  @Query(() => PaginatedUsers, { name: 'searchUsers' })
  searchUsers(
    @Args('query') query: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.userService.searchUsers(query, { page, limit });
  }

  @Query(() => PaginatedUsers, { name: 'topTraders' })
  getTopTraders(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.userService.getTopTraders({ page, limit });
  }

  @Query(() => [UserProfile], { name: 'suggestedUsers' })
  @UseGuards(JwtAuthGuard)
  getSuggestedUsers(
    @CurrentUser('userId') userId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.userService.getSuggestedUsers(userId, limit);
  }

  @Mutation(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  createProfile(
    @CurrentUser('userId') userId: string,
    @Args('input') input: CreateProfileDto,
  ) {
    return this.userService.createProfile(userId, input);
  }

  @Mutation(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Args('input') input: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, input);
  }
}
