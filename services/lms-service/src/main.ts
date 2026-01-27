import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Education Service API')
    .setDescription('Complete education platform API with courses, quizzes, certificates, and more')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('courses', 'Course management')
    .addTag('modules', 'Module management')
    .addTag('lessons', 'Lesson management')
    .addTag('quizzes', 'Quiz management')
    .addTag('progress', 'User progress tracking')
    .addTag('certificates', 'Certificate management')
    .addTag('learning-paths', 'Learning path management')
    .addTag('webinars', 'Webinar management')
    .addTag('badges', 'Badge and gamification')
    .addTag('discussions', 'Discussion forums')
    .addTag('blog', 'Blog posts')
    .addTag('knowledge-base', 'Knowledge base articles')
    .addTag('reviews', 'Course reviews')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Education Service running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  console.log(`🔮 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
