import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestLogger, RequestContextInterceptor } from '@exchange/common';

async function bootstrap() {
  const logger = new Logger('API Gateway');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  app.use(requestLogger('api-gateway'));
  app.useGlobalInterceptors(new RequestContextInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Crypto Exchange API')
    .setDescription('Next-Generation Cryptocurrency Exchange Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Wallets', 'Wallet and balance management')
    .addTag('Trading', 'Order and trade management')
    .addTag('Market', 'Market data and order books')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
