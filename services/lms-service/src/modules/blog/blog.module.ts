import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from '../../entities';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { BlogResolver } from './blog.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost])],
  controllers: [BlogController],
  providers: [BlogService, BlogResolver],
  exports: [BlogService],
})
export class BlogModule {}
