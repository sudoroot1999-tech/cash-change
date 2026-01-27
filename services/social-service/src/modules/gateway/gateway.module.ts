import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocialGateway } from './social.gateway';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SocialGateway, ChatGateway],
  exports: [SocialGateway, ChatGateway],
})
export class GatewayModule {}
