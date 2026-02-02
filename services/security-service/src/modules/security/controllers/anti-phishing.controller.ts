import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AntiPhishingService } from '../services/anti-phishing.service';
import { SetAntiPhishingCodeDto } from '../dto/anti-phishing.dto';
import { RequireAuth } from '@exchange/common';

@Controller('security/anti-phishing')
@RequireAuth()
export class AntiPhishingController {
  constructor(private readonly antiPhishingService: AntiPhishingService) { }

  @Post('set')
  async setCode(@Req() req: any, @Body() dto: SetAntiPhishingCodeDto) {
    const userId = req.user.id;
    const ipAddress = req.ip;

    const result = await this.antiPhishingService.setAntiPhishingCode(
      userId,
      dto.phishingCode,
      ipAddress,
    );

    return {
      success: true,
      message: 'Anti-phishing code set successfully',
      data: { isActive: result.isActive, phishingCode: result.phishingCode },
    };
  }

  @Get('code')
  async getCode(@Req() req: any) {
    const userId = req.user.id;
    const code = await this.antiPhishingService.getAntiPhishingCode(userId);

    return {
      success: true,
      data: code ? { phishingCode: code.phishingCode } : null,
    };
  }

  @Get('suggest')
  suggest() {
    const suggestion = this.antiPhishingService.generateRandomCode();
    return {
      success: true,
      data: { suggestedCode: suggestion },
    };
  }
}
