import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@Controller('wallets')
@ApiBearerAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user wallets with balances' })
  async getUserWallets(@Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return { data: await this.walletsService.getUserWallets(userId) };
  }
}
