import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('P2P Marketplace API')
        .setDescription('P2P cryptocurrency marketplace with escrow and dispute resolution')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('P2P Ads')
        .addTag('P2P Trades')
        .addTag('P2P Disputes')
        .addTag('P2P Ratings')
        .addTag('P2P Statistics')
        .addTag('P2P Chat')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3020;
    await app.listen(port);

    console.log(`
    🚀 P2P Marketplace Service is running!
    🌐 API: http://localhost:${port}
    📚 Swagger Docs: http://localhost:${port}/api/docs
    💬 WebSocket: ws://localhost:${port}/p2p-chat
  `);
}

bootstrap();
