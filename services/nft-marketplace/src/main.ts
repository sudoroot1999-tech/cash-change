import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('NFT Marketplace API')
    .setDescription(
      'Comprehensive NFT marketplace with minting, trading, auctions, staking, and gamification',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('NFT Collections', 'NFT collection management')
    .addTag('NFT Minting', 'Mint ERC-721 and ERC-1155 NFTs')
    .addTag('NFT Marketplace', 'Buy, sell, and list NFTs')
    .addTag('NFT Auctions', 'English and Dutch auctions')
    .addTag('NFT Fractionalization', 'Fractionalize and trade NFT shares')
    .addTag('NFT Staking', 'Stake NFTs to earn rewards')
    .addTag('NFT Loans', 'Use NFTs as collateral for loans')
    .addTag('NFT Gamification', 'Avatars, achievements, and gated content')
    .addTag('NFT Analytics', 'Price history and trending NFTs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = process.env.PORT || 3009;
  await app.listen(port);
  
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   NFT Marketplace Service                  ║
  ║                                            ║
  ║   Server: http://localhost:${port}          ║
  ║   API Docs: http://localhost:${port}/api/docs ║
  ║                                            ║
  ║   Features:                                ║
  ║   ✓ NFT Minting (ERC-721/ERC-1155)         ║
  ║   ✓ Buy/Sell/Auction NFTs                  ║
  ║   ✓ Lazy Minting & Royalties               ║
  ║   ✓ NFT Fractionalization                  ║
  ║   ║   ✓ NFT Staking & Rewards                  ║
  ║   ✓ NFT as Loan Collateral                 ║
  ║   ✓ Gamification & Achievements            ║
  ║   ✓ IPFS Metadata Storage                  ║
  ╚════════════════════════════════════════════╝
  `);
}

bootstrap();
