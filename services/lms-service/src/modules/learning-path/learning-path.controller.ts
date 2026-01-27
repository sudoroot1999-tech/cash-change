import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('learning-paths')
@Controller('learning-paths')
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a learning path' })
  async create(@Body() createDto: CreateLearningPathDto) {
    return this.learningPathService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all learning paths' })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.learningPathService.findAll(paginationDto);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured learning paths' })
  async getFeatured() {
    return this.learningPathService.getFeatured();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my enrolled learning paths' })
  async getMyLearningPaths(@CurrentUser('userId') userId: string) {
    return this.learningPathService.getUserLearningPaths(userId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get learning path by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.learningPathService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get learning path by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.learningPathService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a learning path' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: Partial<CreateLearningPathDto>) {
    return this.learningPathService.update(id, updateDto);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a learning path' })
  async enroll(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string) {
    return this.learningPathService.enroll(userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a learning path' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.learningPathService.remove(id);
  }
}
