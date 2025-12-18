import { Module } from '@nestjs/common';
import { AmlService } from './aml.service';
import { AmlController } from './aml.controller';

@Module({
  controllers: [AmlController],
  providers: [AmlService],
  exports: [AmlService],
})
export class AmlModule {}
