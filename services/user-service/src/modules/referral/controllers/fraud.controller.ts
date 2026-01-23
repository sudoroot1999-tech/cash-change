import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FraudDetectionService } from '../services';
import { AdminGuard, RequireAuth } from '@exchange/common';


@ApiTags('Fraud Detection')
@Controller('fraud')
@RequireAuth()
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class FraudController {
  constructor(private readonly fraudService: FraudDetectionService) { }

  @Get()
  @ApiOperation({ summary: 'Get fraud detections (admin)' })
  @ApiResponse({ status: 200, description: 'Fraud detections retrieved successfully' })
  async getFraudDetections(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('fraudType') fraudType?: string,
  ) {
    return await this.fraudService.getFraudDetections({
      userId,
      status,
      fraudType,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get fraud statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getFraudStats() {
    return await this.fraudService.getSystemFraudStats();
  }

  @Post(':detectionId/review')
  @ApiOperation({ summary: 'Review fraud case (admin)' })
  @ApiResponse({ status: 200, description: 'Fraud case reviewed successfully' })
  async reviewFraudCase(
    @Request() req,
    @Param('detectionId') detectionId: string,
    @Body() body: { action: 'confirmed' | 'false_positive' | 'resolved'; notes?: string },
  ) {
    return await this.fraudService.reviewFraudCase(
      detectionId,
      req.user.userId,
      body.action,
      body.notes,
    );
  }
}
