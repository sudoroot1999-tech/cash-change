import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MpcService } from './mpc.service';

@ApiTags('MPC')
@Controller('mpc')
@ApiBearerAuth()
export class MpcController {
  constructor(private readonly mpcService: MpcService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate new MPC key (Simulated)' })
  async generateKey() {
    return this.mpcService.generateKey();
  }

  @Post('sign')
  @ApiOperation({ summary: 'Sign message with MPC key (Simulated)' })
  async sign(@Body() body: { keyId: string, hash: string }) {
    return this.mpcService.sign(body.keyId, body.hash);
  }
}
