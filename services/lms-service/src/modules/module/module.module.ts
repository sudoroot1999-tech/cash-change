import { Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '../../entities/module.entity';
import { ModuleService } from './module.service';
import { ModuleController } from './module.controller';
import { ModuleResolver } from './module.resolver';

@NestModule({
  imports: [TypeOrmModule.forFeature([Module])],
  controllers: [ModuleController],
  providers: [ModuleService, ModuleResolver],
  exports: [ModuleService],
})
export class ModuleModule {}
