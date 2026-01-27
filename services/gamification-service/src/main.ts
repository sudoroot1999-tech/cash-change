import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Gamification Service API')
      .setDescription('Comprehensive gamification system with levels, badges, missions, challenges, and mini-games')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('gamification')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }


  const port = process.env.PORT || 3012;
  await app.listen(port);

  logger.log(`
    🎮 Gamification Service is running!
    🌐 API: http://localhost:${port}
    📚 Swagger Docs: http://localhost:${port}/api/docs
  `);
}

bootstrap();
