import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MpcKey } from './entities/mpc-key.entity';
import { MpcService } from './mpc.service';
import { MpcController } from './mpc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MpcKey])],
  controllers: [MpcController],
  providers: [MpcService],
  exports: [MpcService],
})
export class MpcModule {}
