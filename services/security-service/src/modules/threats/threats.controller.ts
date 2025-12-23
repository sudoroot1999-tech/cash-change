import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequireAuth } from '@exchange/common';
import { ThreatsService } from './threats.service';

@ApiTags('Threats')
@Controller('threats')
@RequireAuth()
export class ThreatsController {
  constructor(private readonly threatsService: ThreatsService) {}

  @Post('event')
  @ApiOperation({ summary: 'Log security event (Internal)' })
  async logEvent(@Body() body: any) {
    return this.threatsService.logEvent(
      body.userId,
      body.type,
      body.ipAddress,
      body.userAgent,
      body.metadata,
    );
  }

  @Get('risk/:userId')
  @ApiOperation({ summary: 'Get user risk score' })
  async getRisk(@Param('userId') userId: string) {
    const score = await this.threatsService.analyzeRisk(userId);
    return { riskScore: score };
  }
}
