import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequireAuth, CurrentUser, AuthenticatedUser, Public } from '@exchange/common';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@Controller('wallets')
@RequireAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user wallets with balances' })
  async getUserWallets(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.walletsService.getUserWallets(user.userId) };
  }

  @Public()
  @Get('markets')
  @ApiOperation({ summary: 'Get all markets data' })
  async getMarkets() {
    return { data: await this.walletsService.getMarkets() };
  }
}
