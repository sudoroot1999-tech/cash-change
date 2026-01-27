import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CopyTradingService } from './copy-trading.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('copy-trading')
@Controller('copy-trading')
export class CopyTradingController {
  constructor(private readonly copyTradingService: CopyTradingService) {}

  @Post('start/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start copying a trader' })
  @ApiParam({ name: 'traderId' })
  startCopying(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string, @Body() settings: { allocatedAmount: number; copyRatio?: number; maxDrawdown?: number; stopLossAmount?: number; takeProfitAmount?: number; copyAllPairs?: boolean; allowedPairs?: string[]; excludedPairs?: string[] }) {
    return this.copyTradingService.startCopying(copierId, traderId, settings);
  }

  @Post('stop/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop copying a trader' })
  @ApiParam({ name: 'traderId' })
  stopCopying(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string) {
    return this.copyTradingService.stopCopying(copierId, traderId);
  }

  @Post('pause/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause copying a trader' })
  @ApiParam({ name: 'traderId' })
  pauseCopying(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string) {
    return this.copyTradingService.pauseCopying(copierId, traderId);
  }

  @Post('resume/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume copying a trader' })
  @ApiParam({ name: 'traderId' })
  resumeCopying(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string) {
    return this.copyTradingService.resumeCopying(copierId, traderId);
  }

  @Put('settings/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update copy trading settings' })
  @ApiParam({ name: 'traderId' })
  updateSettings(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string, @Body() settings: any) {
    return this.copyTradingService.updateSettings(copierId, traderId, settings);
  }

  @Get('my-copying')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get traders I am copying' })
  getMyCopying(@CurrentUser('userId') copierId: string, @Query() pagination: PaginationDto) {
    return this.copyTradingService.getMyCopying(copierId, pagination);
  }

  @Get('my-copiers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users copying me' })
  getMyCopiers(@CurrentUser('userId') traderId: string, @Query() pagination: PaginationDto) {
    return this.copyTradingService.getMyCopiers(traderId, pagination);
  }

  @Get('relationship/:traderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get copy relationship with a trader' })
  @ApiParam({ name: 'traderId' })
  getRelationship(@CurrentUser('userId') copierId: string, @Param('traderId') traderId: string) {
    return this.copyTradingService.getCopyRelationship(copierId, traderId);
  }

  @Get('top-traders')
  @ApiOperation({ summary: 'Get top traders to copy' })
  getTopTraders(@Query() pagination: PaginationDto) {
    return this.copyTradingService.getTopTraders(pagination);
  }
}
