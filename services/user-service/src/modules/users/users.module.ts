import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersGrpcController } from './users.grpc.controller';
import { UserEventsService } from './services/user-events.service';
import { UserProfile } from './entities/profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserLimits } from './entities/user-limits.entity';
import { StorageService } from '@exchange/common';
import { QueueService } from '@exchange/common';
import { UserProfileSyncWorker } from './services/users.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([User,UserProfile,UserPreferences,UserLimits])
  ],
  controllers: [UsersController, UsersGrpcController],
  providers: [UsersService,UserEventsService,StorageService,QueueService,UserProfileSyncWorker],
  exports: [UsersService],
})
export class UsersModule {}
