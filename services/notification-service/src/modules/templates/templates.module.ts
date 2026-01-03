import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/template.entity';
import { TemplateService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplate])],
  controllers: [TemplatesController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplatesModule {}
