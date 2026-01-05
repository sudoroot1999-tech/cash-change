import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersGrpcController } from './users.grpc.controller';
import { UserEventsService } from './services/user-events.service';
import { UserProfile } from './entities/profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserLimits } from './entities/user-limits.entity';
import { UserProfileSyncWorker } from './services/users.worker';
import { PasswordService } from '@exchange/common';
import { JWTAuthService } from '@exchange/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserPreferences, UserLimits]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [UsersController, UsersGrpcController],
  providers: [UsersService, UserEventsService, UserProfileSyncWorker, PasswordService, JWTAuthService],
  exports: [UsersService],
})
export class UsersModule { }
