import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthEventsService } from './services/auth-events.service';
import { UserGrpcAdapter } from './adapters/user-grpc.adapter';
import { SECURITY_PORT, USER_PORT } from './tokens/auth.tokens';
import { SecurityGrpcAdapter } from './adapters/security-grpc.adaptor';
import { NotificationEventsService } from './services/notification-events.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'USER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, '../../libs/common/proto/user.proto'),
            url: configService.get('USER_SERVICE_GRPC_URL', 'localhost:5001'),
          },
        }),
      },
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
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEventsService,
    NotificationEventsService,
    UserGrpcAdapter,
    SecurityGrpcAdapter,
    {
      provide: USER_PORT,
      useExisting: UserGrpcAdapter,
    },
    {
      provide: SECURITY_PORT,
      useExisting: SecurityGrpcAdapter,
    },
  ],
  exports: [AuthService],
})
export class AuthModule { }
