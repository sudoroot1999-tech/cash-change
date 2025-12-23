import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequireAuth, Public, CurrentUser, AuthenticatedUser } from '@exchange/common';
import { ReservesService } from './reserves.service';

@ApiTags('Proof of Reserves')
@Controller('reserves')
@RequireAuth()
export class ReservesController {
  constructor(private readonly reservesService: ReservesService) {}

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest Merkle Root snapshot' })
  async getLatestSnapshot() {
    return this.reservesService.getLatestSnapshot();
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify user balance inclusion (Simulated)' })
  async verifyInclusion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { balance: number, nonce: string, rootHash: string },
  ) {
    const verified = await this.reservesService.verifyUser(user.userId, body.balance, body.nonce, body.rootHash);
    return { verified };
  }

  @Post('trigger-snapshot')
  @ApiOperation({ summary: 'Manually trigger a snapshot generation' })
  async triggerSnapshot() {
    await this.reservesService.generateDailySnapshot();
    return { message: 'Snapshot generation started' };
  }
}
