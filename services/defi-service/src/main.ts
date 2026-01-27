import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('DeFi Integration Service API')
    .setDescription(
      'Comprehensive DeFi service with staking, yield farming, and lending/borrowing',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Staking', 'Flexible and locked staking operations')
    .addTag('Liquidity & Yield Farming', 'Liquidity pool and farming operations')
    .addTag('Lending & Borrowing', 'Collateralized lending and borrowing')
    .addTag('Rewards', 'Rewards tracking and management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port);

  console.log(`
  ╔════════════════════════════════════════════╗
  ║   DeFi Integration Service                 ║
  ║                                            ║
  ║   Server: http://localhost:${port}         ║
  ║   API Docs: http://localhost:${port}/docs  ║
  ║                                            ║
  ║   Features:                                ║
  ║   ✓ Flexible & Locked Staking              ║
  ║   ✓ Liquidity Pools & Yield Farming        ║
  ║   ✓ Lending & Borrowing                    ║
  ║   ✓ NFT Collateral Support                 ║
  ║   ✓ External DeFi Integration              ║
  ║   ✓ Smart Contract Security                ║
  ╚════════════════════════════════════════════╝
  `);
}

bootstrap();
