import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile, Post, Channel } from '../../database/entities';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchResolver } from './search.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, Post, Channel])],
  controllers: [SearchController],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
