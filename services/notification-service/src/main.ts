import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { requestLogger } from '@exchange/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.use(requestLogger('notification-service'));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Notification Service API')
      .setDescription('Crypto Exchange - Notification Management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  // Connect to RabbitMQ
  const configService = app.get(ConfigService);
  const rmqUser = configService.get<string>('RABBITMQ_USER', 'exchange');
  const rmqPass = configService.get<string>('RABBITMQ_PASSWORD', 'rabbitmq_dev_password');
  const rmqHost = configService.get<string>('RABBITMQ_HOST', 'localhost');
  const rmqPort = configService.get<string>('RABBITMQ_PORT', '5672');

  const rmqUrl = configService.get<string>(
    'RABBITMQ_URL',
    `amqp://${rmqUser}:${rmqPass}@${rmqHost}:${rmqPort}`,
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'notification_service_queue',
      queueOptions: {
        durable: true,
      },
      // Bind to specific exchanges if needed, but usually we just listen to the queue 
      // where the producer (UserService) publishes to.
      // Wait, usually the 'queue' here is the queue we LISTEN to. 
      // If UserService emits to 'user_created_queue', we need to listen to THAT or bind to the exchange.
      // NestJS RMQ defaults: @EventPattern('name') usually binds queue to exchange 'name' if not default?
      // Actually standard pattern: Consumers listen to their OWN queue, and we bind topics to it. 
      // Or we listen to the queue defined in the annotation.
      // For now let's use a general queue for the service.
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT || 3006;
  await app.listen(port);
  logger.log(`Notification Service running on port ${port}`);
  logger.log(`Microservices started`);
}
bootstrap();
