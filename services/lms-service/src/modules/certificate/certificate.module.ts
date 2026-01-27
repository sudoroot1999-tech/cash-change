import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { CertificateResolver } from './certificate.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate])],
  controllers: [CertificateController],
  providers: [CertificateService, CertificateResolver],
  exports: [CertificateService],
})
export class CertificateModule {}
