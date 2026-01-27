import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { join } from 'path';
// Modules
import { CourseModule } from './modules/course/course.module';
import { ModuleModule } from './modules/module/module.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { WebinarModule } from './modules/webinar/webinar.module';
import { BadgeModule } from './modules/badge/badge.module';
import { DiscussionModule } from './modules/discussion/discussion.module';
import { BlogModule } from './modules/blog/blog.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { ReviewModule } from './modules/review/review.module';
import { AuthModule } from './modules/auth/auth.module';
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
          schema: 'lms',
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

    // Feature modules
    AuthModule,
    CourseModule,
    ModuleModule,
    LessonModule,
    QuizModule,
    ProgressModule,
    CertificateModule,
    LearningPathModule,
    WebinarModule,
    BadgeModule,
    DiscussionModule,
    BlogModule,
    KnowledgeBaseModule,
    ReviewModule,
    SecurityModule,
    PerformanceModule
  ],
})
export class AppModule { }
