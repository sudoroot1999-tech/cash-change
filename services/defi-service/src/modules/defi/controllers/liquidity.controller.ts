import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LiquidityService } from '../services/liquidity.service';
import {
  AddLiquidityDto,
  RemoveLiquidityDto,
  HarvestRewardsDto,
  LiquidityPoolResponseDto,
  LiquidityPositionResponseDto,
} from '../dto/liquidity.dto';

@ApiTags('Liquidity & Yield Farming')
@Controller('defi')
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Post('add-liquidity')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add liquidity to a pool' })
  @ApiResponse({ status: 201, description: 'Liquidity added successfully', type: LiquidityPositionResponseDto })
  async addLiquidity(@Request() req, @Body() addLiquidityDto: AddLiquidityDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.liquidityService.addLiquidity(userId, addLiquidityDto);
  }

  @Post('remove-liquidity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove liquidity from a pool' })
  @ApiResponse({ status: 200, description: 'Liquidity removed successfully', type: LiquidityPositionResponseDto })
  async removeLiquidity(@Request() req, @Body() removeLiquidityDto: RemoveLiquidityDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.liquidityService.removeLiquidity(userId, removeLiquidityDto);
  }

  @Post('harvest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Harvest farming rewards from a pool' })
  @ApiResponse({ status: 200, description: 'Rewards harvested successfully' })
  async harvestRewards(@Request() req, @Body() harvestDto: HarvestRewardsDto) {
    const userId = req.user?.id || 'mock-user-id';
    const amount = await this.liquidityService.harvestRewards(userId, harvestDto.poolId);
    return { success: true, rewardAmount: amount };
  }

  @Get('pools')
  @ApiOperation({ summary: 'Get all active liquidity pools' })
  @ApiResponse({ status: 200, description: 'Pools retrieved successfully', type: [LiquidityPoolResponseDto] })
  async getPools() {
    return await this.liquidityService.getPools();
  }

  @Get('pools/:id')
  @ApiOperation({ summary: 'Get specific liquidity pool details' })
  @ApiResponse({ status: 200, description: 'Pool details retrieved', type: LiquidityPoolResponseDto })
  async getPool(@Param('id') poolId: string) {
    // Implementation would fetch single pool
    return { message: 'Get pool details', poolId };
  }

  @Get('liquidity-positions')
  @ApiOperation({ summary: 'Get all liquidity positions for user' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully', type: [LiquidityPositionResponseDto] })
  async getLiquidityPositions(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.liquidityService.getUserPositions(userId);
  }
}
