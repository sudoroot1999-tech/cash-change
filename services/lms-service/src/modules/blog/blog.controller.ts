import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog post' })
  async create(@Body() createDto: any) { return this.blogService.create(createDto); }

  @Get()
  @ApiOperation({ summary: 'Get all blog posts' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(@Query() paginationDto: PaginationDto, @Query('category') category?: string) {
    return this.blogService.findAll(paginationDto, category);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured posts' })
  async getFeatured() { return this.blogService.getFeatured(); }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() { return this.blogService.getCategories(); }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get post by slug' })
  async findBySlug(@Param('slug') slug: string) { return this.blogService.findBySlug(slug); }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.blogService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any) {
    return this.blogService.update(id, updateDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a post' })
  async publish(@Param('id', ParseUUIDPipe) id: string) { return this.blogService.publish(id); }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  async like(@Param('id', ParseUUIDPipe) id: string) { return this.blogService.like(id); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  async remove(@Param('id', ParseUUIDPipe) id: string) { return this.blogService.remove(id); }
}
