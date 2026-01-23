import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'wallet',
      protoPath: join(__dirname, 'libs/common/proto/wallet.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 5003}`,
    },
  });

  // Connect RabbitMQ microservice
  // Need to import ConfigService in main.ts or get from context? 
  // Wait, I can't easily get ConfigService from app context if I haven't imported it in main.ts
  // Actually I can: app.get(ConfigService).
  // But I need to add import.

  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Wallet Service API')
      .setDescription('Crypto Exchange - Wallet Management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT || 3003;
  await app.startAllMicroservices();
  await app.listen(port);
  logger.log(`Wallet Service running on port ${port} (HTTP) and ${process.env.GRPC_PORT || 5003} (gRPC)`);
}
bootstrap();
