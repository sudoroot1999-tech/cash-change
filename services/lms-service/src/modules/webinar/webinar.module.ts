import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webinar, WebinarRegistration } from '../../entities';
import { WebinarService } from './webinar.service';
import { WebinarController } from './webinar.controller';
import { WebinarResolver } from './webinar.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Webinar, WebinarRegistration])],
  controllers: [WebinarController],
  providers: [WebinarService, WebinarResolver],
  exports: [WebinarService],
})
export class WebinarModule {}
