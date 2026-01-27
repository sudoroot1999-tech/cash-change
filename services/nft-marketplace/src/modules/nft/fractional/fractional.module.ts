import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FractionalController } from './fractional.controller';
import { FractionalService } from './fractional.service';
import { Nft } from '../../../entities/nft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nft])],
  controllers: [FractionalController],
  providers: [FractionalService],
  exports: [FractionalService],
})
export class FractionalModule {}
