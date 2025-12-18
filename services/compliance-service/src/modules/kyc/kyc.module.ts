import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { KycRequest } from './entities/kyc-request.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycRequest]),
    HttpModule,
  ],
  controllers: [KycController],
  providers: [KycService],
})
export class KycModule {}
