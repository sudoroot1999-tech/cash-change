import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Marketing Service API')
    .setDescription('Marketing automation service with referrals, airdrops, loyalty programs, and campaigns')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('referral', 'Referral system management')
    .addTag('airdrop', 'Airdrop campaigns')
    .addTag('loyalty', 'Loyalty program')
    .addTag('email', 'Email marketing')
    .addTag('push', 'Push notifications')
    .addTag('attribution', 'Attribution tracking')
    .addTag('affiliate', 'Affiliate program')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(`🚀 Marketing Service running on port ${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  console.log(`📊 Features enabled:`);
  console.log(`   ✓ Referral System with Multi-tier Commissions`);
  console.log(`   ✓ Airdrop Management with Vesting`);
  console.log(`   ✓ Loyalty Program with Tier Benefits`);
  console.log(`   ✓ Email Marketing Automation`);
  console.log(`   ✓ Push Notification Campaigns`);
  console.log(`   ✓ Attribution Tracking & Analytics`);
  console.log(`   ✓ Affiliate Program Management`);
}

bootstrap();
