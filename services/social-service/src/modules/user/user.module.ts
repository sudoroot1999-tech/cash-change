import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../../database/entities';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserResolver } from './user.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile])],
  controllers: [UserController],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
