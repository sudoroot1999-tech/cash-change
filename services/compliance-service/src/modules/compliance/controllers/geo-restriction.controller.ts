import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeoRestrictionService } from '../services/geo-restriction.service';
import { RequireAuth } from '@exchange/common';

@ApiTags('Geographic Restrictions')
@RequireAuth()
@Controller('compliance/geo-restriction')
export class GeoRestrictionController {
  constructor(private readonly geoRestrictionService: GeoRestrictionService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check IP restriction' })
  async checkRestriction(@Body() body: { ipAddress?: string }, @Request() req: any) {
    const userId = req.user?.id;
    const ipAddress = body.ipAddress || req.ip;

    const restriction = await this.geoRestrictionService.checkIpRestriction(ipAddress, userId);

    return {
      success: true,
      data: restriction,
    };
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate user access' })
  async validateAccess(@Request() req: any) {
    const userId = req.user?.id;
    const ipAddress = req.ip;

    try {
      await this.geoRestrictionService.validateAccess(ipAddress, userId);

      return {
        success: true,
        message: 'Access allowed',
      };
    } catch (error:any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('feature-allowed')
  @ApiOperation({ summary: 'Check if feature is allowed for user location' })
  async isFeatureAllowed(@Query('feature') feature: string, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const allowed = await this.geoRestrictionService.isFeatureAllowed(userId, feature);

    return {
      success: true,
      data: {
        feature,
        allowed,
      },
    };
  }

  @Get('jurisdiction-terms')
  @ApiOperation({ summary: 'Get jurisdiction-based terms of service' })
  async getJurisdictionTerms(@Query('country') country: string) {
    const terms = await this.geoRestrictionService.getJurisdictionTerms(country);

    return {
      success: true,
      data: terms,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get geo restriction statistics (Admin only)' })
  async getStats() {
    const stats = await this.geoRestrictionService.getRestrictionStats();

    return {
      success: true,
      data: stats,
    };
  }
}
