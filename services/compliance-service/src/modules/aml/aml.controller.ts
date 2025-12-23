import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequireAuth } from '@exchange/common';
import { AmlService } from './aml.service';

@ApiTags('AML')
@Controller('aml')
@RequireAuth()
export class AmlController {
  constructor(private readonly amlService: AmlService) {}

  @Get('check-address')
  @ApiOperation({ summary: 'Check crypto address risk' })
  async checkAddress(@Query('address') address: string, @Query('chain') chain: string) {
    return this.amlService.checkAddress(address, chain);
  }
}
