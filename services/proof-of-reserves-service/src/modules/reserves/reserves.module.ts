import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerkleSnapshot } from './entities/merkle-snapshot.entity';
import { ReservesService } from './reserves.service';
import { ReservesController } from './reserves.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MerkleSnapshot])],
  controllers: [ReservesController],
  providers: [ReservesService],
  exports: [ReservesService],
})
export class ReservesModule {}
