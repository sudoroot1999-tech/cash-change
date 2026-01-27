import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DisputeService } from '../services/dispute.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { DisputeStatus, DisputeResolution } from '../entities/p2p-dispute.entity';

@ApiTags('P2P Disputes')
@Controller('p2p/dispute')
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created successfully' })
  async createDispute(
    @Body() dto: CreateDisputeDto & { tradeId: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.disputeService.createDispute(dto.tradeId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute retrieved successfully' })
  async getDisputeById(@Param('id') id: string) {
    return this.disputeService.getDisputeById(id);
  }

  @Get('trade/:tradeId')
  @ApiOperation({ summary: 'Get dispute by trade ID' })
  @ApiResponse({ status: 200, description: 'Dispute retrieved successfully' })
  async getDisputeByTradeId(@Param('tradeId') tradeId: string) {
    return this.disputeService.getDisputeByTradeId(tradeId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all disputes (admin)' })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async getAllDisputes(@Query('status') status: DisputeStatus) {
    return this.disputeService.getAllDisputes(status);
  }

  @Get('user/my-disputes')
  @ApiOperation({ summary: 'Get user disputes' })
  @ApiResponse({ status: 200, description: 'User disputes retrieved successfully' })
  async getUserDisputes(@Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.disputeService.getUserDisputes(userId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign dispute to admin' })
  @ApiResponse({ status: 200, description: 'Dispute assigned successfully' })
  async assignDispute(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.id || req.headers['x-user-id'];
    return this.disputeService.assignDispute(id, adminId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve dispute' })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully' })
  async resolveDispute(
    @Param('id') id: string,
    @Body() body: { resolution: DisputeResolution; notes: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.headers['x-user-id'];
    return this.disputeService.resolveDispute(id, adminId, body.resolution, body.notes);
  }

  @Post(':id/note')
  @ApiOperation({ summary: 'Add admin note to dispute' })
  @ApiResponse({ status: 200, description: 'Note added successfully' })
  async addAdminNote(
    @Param('id') id: string,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.headers['x-user-id'];
    return this.disputeService.addAdminNote(id, adminId, note);
  }
}
