import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { ArticleType } from '../../database/entities';

@ApiTags('knowledge-base')
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an article' })
  async create(@Body() createDto: any) { return this.kbService.create(createDto); }

  @Get()
  @ApiOperation({ summary: 'Get all articles' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ArticleType })
  async findAll(@Query() paginationDto: PaginationDto, @Query('category') category?: string, @Query('type') type?: ArticleType) {
    return this.kbService.findAll(paginationDto, category, type);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured articles' })
  async getFeatured() { return this.kbService.getFeatured(); }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() { return this.kbService.getCategories(); }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get article by slug' })
  async findBySlug(@Param('slug') slug: string) { return this.kbService.findBySlug(slug); }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.kbService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an article' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any) {
    return this.kbService.update(id, updateDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish an article' })
  async publish(@Param('id', ParseUUIDPipe) id: string) { return this.kbService.publish(id); }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark article as helpful' })
  async markHelpful(@Param('id', ParseUUIDPipe) id: string, @Body('helpful') helpful: boolean) {
    return this.kbService.markHelpful(id, helpful);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an article' })
  async remove(@Param('id', ParseUUIDPipe) id: string) { return this.kbService.remove(id); }
}
