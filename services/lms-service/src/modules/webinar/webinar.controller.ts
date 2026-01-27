import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WebinarService } from './webinar.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebinarStatus } from '../../database/entities';

@ApiTags('webinars')
@Controller('webinars')
export class WebinarController {
  constructor(private readonly webinarService: WebinarService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a webinar' })
  async create(@Body() createDto: any) { return this.webinarService.create(createDto); }

  @Get()
  @ApiOperation({ summary: 'Get all webinars' })
  @ApiQuery({ name: 'status', required: false, enum: WebinarStatus })
  async findAll(@Query() paginationDto: PaginationDto, @Query('status') status?: WebinarStatus) {
    return this.webinarService.findAll(paginationDto, status);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming webinars' })
  async getUpcoming(@Query('limit') limit?: number) { return this.webinarService.getUpcoming(limit || 10); }

  @Get('live')
  @ApiOperation({ summary: 'Get live webinars' })
  async getLive() { return this.webinarService.getLive(); }

  @Get('my-registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my webinar registrations' })
  async getMyRegistrations(@CurrentUser('userId') userId: string) {
    return this.webinarService.getUserRegistrations(userId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get webinar by slug' })
  async findBySlug(@Param('slug') slug: string) { return this.webinarService.findBySlug(slug); }

  @Get(':id')
  @ApiOperation({ summary: 'Get webinar by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.webinarService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a webinar' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any) {
    return this.webinarService.update(id, updateDto);
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for a webinar' })
  async register(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string) {
    return this.webinarService.register(userId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update webinar status' })
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: WebinarStatus) {
    return this.webinarService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webinar' })
  async remove(@Param('id', ParseUUIDPipe) id: string) { return this.webinarService.remove(id); }
}
