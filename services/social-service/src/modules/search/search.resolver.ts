import { Resolver, Query, Args, Int, registerEnumType } from '@nestjs/graphql';
import { SearchService, SearchType } from './search.service';
import { UserProfile, Post, Channel } from '../../database/entities';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

registerEnumType(SearchType, { name: 'SearchType' });

@ObjectType()
class SearchResults {
  @Field(() => [UserProfile], { nullable: true }) users?: UserProfile[];
  @Field(() => [Post], { nullable: true }) posts?: Post[];
  @Field(() => [Channel], { nullable: true }) channels?: Channel[];
}

@ObjectType()
class TrendingHashtag {
  @Field() tag: string;
  @Field(() => Int) count: number;
}

@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResults, { name: 'search' })
  search(@Args('query') query: string) {
    return this.searchService.searchAll(query, { page: 1, limit: 10 });
  }

  @Query(() => [TrendingHashtag], { name: 'trendingHashtags' })
  getTrending(@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number) {
    return this.searchService.getTrendingHashtags(limit);
  }
}
