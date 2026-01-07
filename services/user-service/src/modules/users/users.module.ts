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
import { PasswordService, PerformanceModule, RateLimiterService } from '@exchange/common';
import { JWTAuthService } from '@exchange/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { SECURITY_PORT } from './tokens/user.tokens';
import { SecurityGrpcAdapter } from './adapters/security-grpc.adaptor';
import { StorageModule } from '@exchange/common';

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
    ClientsModule.registerAsync([
      {
        name: 'SECURITY_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'security',
            protoPath: join(__dirname, '../../libs/common/proto/security.proto'),
            url: configService.get('SECURITY_SERVICE_GRPC_URL', 'localhost:5008'),
          },
        }),
      },
    ]),
    StorageModule,
  ],
  controllers: [UsersController, UsersGrpcController],
  providers: [
    UsersService,
    UserEventsService,
    PasswordService,
    JWTAuthService,
    RateLimiterService,
    SecurityGrpcAdapter,
    PerformanceModule,
    {
      provide: SECURITY_PORT,
      useExisting: SecurityGrpcAdapter,
    },
  ],
  exports: [UsersService],
})
export class UsersModule { }
