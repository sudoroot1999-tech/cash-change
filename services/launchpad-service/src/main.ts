import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('Launchpad API')
        .setDescription('IEO Launchpad Service API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Launchpad', 'Public launchpad endpoints')
        .addTag('Staking', 'Platform token staking endpoints')
        .addTag('Admin - Launchpad', 'Admin management endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3016;
    await app.listen(port);

    console.log(`
    🚀 Launchpad Service is running!
    📚 API Documentation: http://localhost:${port}/api/docs
    🔗 API Endpoint: http://localhost:${port}/api/v1
  `);
}

bootstrap();
