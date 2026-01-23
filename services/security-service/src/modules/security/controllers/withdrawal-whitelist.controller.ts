import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { WithdrawalWhitelistService } from '../services/withdrawal-whitelist.service';
import { AddWhitelistAddressDto } from '../dto/withdrawal-whitelist.dto';
import { RequireAuth } from '@exchange/common';

@Controller('security/whitelist')
@RequireAuth()
export class WithdrawalWhitelistController {
  constructor(
    private readonly whitelistService: WithdrawalWhitelistService,
  ) {}

  @Post('add')
  async addAddress(@Req() req: any, @Body() dto: AddWhitelistAddressDto) {
    const userId = req.user.id;
    const ipAddress = req.ip;

    const whitelist = await this.whitelistService.addToWhitelist({
      userId,
      ...dto,
      ipAddress,
    });

    return {
      success: true,
      message: 'Address added to whitelist. Please confirm via email and SMS.',
      data: whitelist,
    };
  }

  @Post('confirm-email/:whitelistId')
  async confirmEmail(@Req() req: any, @Param('whitelistId') whitelistId: string) {
    const userId = req.user.id;
    const result = await this.whitelistService.confirmViaEmail(whitelistId, userId);

    return {
      success: true,
      message: 'Email confirmation successful',
      data: result,
    };
  }

  @Post('confirm-sms/:whitelistId')
  async confirmSms(@Req() req: any, @Param('whitelistId') whitelistId: string) {
    const userId = req.user.id;
    const result = await this.whitelistService.confirmViaSms(whitelistId, userId);

    return {
      success: true,
      message: 'SMS confirmation successful',
      data: result,
    };
  }

  @Get()
  async getWhitelist(@Req() req: any, @Query('currency') currency?: string) {
    const userId = req.user.id;
    const whitelist = await this.whitelistService.getUserWhitelist(userId, currency);

    return {
      success: true,
      data: whitelist,
    };
  }

  @Delete(':whitelistId')
  async removeAddress(@Req() req: any, @Param('whitelistId') whitelistId: string) {
    const userId = req.user.id;
    await this.whitelistService.removeFromWhitelist(userId, whitelistId);

    return {
      success: true,
      message: 'Address removed from whitelist',
    };
  }
}
