import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../../database/entities';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report])],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
