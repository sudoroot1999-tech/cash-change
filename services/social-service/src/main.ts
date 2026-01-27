import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);

  // Register Fastify plugins
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: configService.get('MAX_FILE_SIZE', 10485760), // 10MB default
    },
  });

  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Social Trading Platform API')
    .setDescription(`
      Complete social trading platform with internal social media features.
      
      ## Features
      - **Social Feed**: Posts, comments, likes, shares, stories
      - **Chat System**: Private messages, group chats, channels
      - **User Profiles**: Trader profiles, followers, following
      - **Copy Trading**: Follow and copy successful traders
      - **Competitions**: Trading competitions and leaderboards
      - **Notifications**: Real-time notifications
      - **Media**: Image/video uploads, galleries
      - **Analytics**: Trading performance analytics
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User profile management')
    .addTag('posts', 'Social feed posts')
    .addTag('comments', 'Post comments')
    .addTag('stories', 'User stories')
    .addTag('chat', 'Private and group messaging')
    .addTag('channels', 'Public channels')
    .addTag('followers', 'Follow system')
    .addTag('copy-trading', 'Copy trading features')
    .addTag('competitions', 'Trading competitions')
    .addTag('leaderboard', 'Leaderboard rankings')
    .addTag('notifications', 'User notifications')
    .addTag('media', 'Media uploads')
    .addTag('search', 'Search functionality')
    .addTag('analytics', 'Trading analytics')
    .addTag('reports', 'Content reporting')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get('PORT', 3020);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Social Trading Service running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  console.log(`🔮 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
