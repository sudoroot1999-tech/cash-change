import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { requestLogger } from '@exchange/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(requestLogger('security-service'));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Security Service API')
      .setDescription('Crypto Exchange - Security, Threat Detection & MPC')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'security',
      protoPath: join(__dirname, '../../../libs/common/proto/security.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 5008}`,
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT || 3008;
  await app.listen(port);
  logger.log(`Security Service running on port ${port}`);
}
bootstrap();
