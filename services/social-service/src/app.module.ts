import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';

// Core Modules
import { AuthModule } from './modules/auth/auth.module';

// Social Media Modules
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { CommentModule } from './modules/comment/comment.module';
import { StoryModule } from './modules/story/story.module';
import { FollowerModule } from './modules/follower/follower.module';

// Chat Modules
import { ChatModule } from './modules/chat/chat.module';
import { ChannelModule } from './modules/channel/channel.module';

// Trading Social Modules
import { CopyTradingModule } from './modules/copy-trading/copy-trading.module';
import { CompetitionModule } from './modules/competition/competition.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Support Modules
import { NotificationModule } from './modules/notification/notification.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { ReportModule } from './modules/report/report.module';

// WebSocket Gateway
import { GatewayModule } from './modules/gateway/gateway.module';
import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, getOptimizedDatabaseConfig, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule } from '@exchange/common';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env']
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => (
        getOptimizedDatabaseConfig(configService, {
          schema: 'social',
        })
      ),
      inject: [ConfigService],
    }),

    // GraphQL with Mercurius (Fastify-native)
    GraphQLModule.forRootAsync<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): MercuriusDriverConfig => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        graphiql: configService.get('GRAPHQL_PLAYGROUND', 'true') === 'true',
        subscription: true,
        context: (request: any) => ({ request }),
      }),
      inject: [ConfigService],
    }),
    // Event Emitter
    EventEmitterModule.forRoot(),

    // Core Modules
    AuthModule,

    // Social Media Modules
    UserModule,
    PostModule,
    CommentModule,
    StoryModule,
    FollowerModule,

    // Chat Modules
    ChatModule,
    ChannelModule,

    // Trading Social Modules
    CopyTradingModule,
    CompetitionModule,
    LeaderboardModule,
    AnalyticsModule,

    // Support Modules
    NotificationModule,
    MediaModule,
    SearchModule,
    ReportModule,

    // WebSocket Gateway
    GatewayModule,
    SecurityModule,
    PerformanceModule
  ],
})
export class AppModule { }
