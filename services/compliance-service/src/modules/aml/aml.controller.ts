import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AmlService } from './aml.service';

@ApiTags('AML')
@Controller('aml')
@ApiBearerAuth()
export class AmlController {
  constructor(private readonly amlService: AmlService) {}

  @Get('check-address')
  @ApiOperation({ summary: 'Check crypto address risk' })
  async checkAddress(@Query('address') address: string, @Query('chain') chain: string) {
    return this.amlService.checkAddress(address, chain);
  }
}
