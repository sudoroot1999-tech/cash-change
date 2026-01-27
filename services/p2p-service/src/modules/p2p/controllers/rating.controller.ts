import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RatingService } from '../services/rating.service';
import { CreateRatingDto } from '../dto/create-rating.dto';

@ApiTags('P2P Ratings')
@Controller('p2p/rating')
export class RatingController {
  constructor(private ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Rate a user after trade' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  async createRating(
    @Body() dto: CreateRatingDto & { tradeId: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.ratingService.createRating(dto.tradeId, userId, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user ratings' })
  @ApiResponse({ status: 200, description: 'User ratings retrieved successfully' })
  async getUserRatings(@Param('userId') userId: string) {
    return this.ratingService.getUserRatings(userId);
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Get user rating statistics' })
  @ApiResponse({ status: 200, description: 'Rating stats retrieved successfully' })
  async getRatingStats(@Param('userId') userId: string) {
    return this.ratingService.getRatingStats(userId);
  }

  @Get('trade/:tradeId')
  @ApiOperation({ summary: 'Get rating by trade' })
  @ApiResponse({ status: 200, description: 'Rating retrieved successfully' })
  async getRatingByTrade(@Param('tradeId') tradeId: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.ratingService.getRatingByTrade(tradeId, userId);
  }
}
