import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleSwaggerDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('modules')
@Controller('modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new module' })
  @ApiResponse({ status: 201, description: 'Module created successfully' })
  async create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.create(createModuleDto);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all modules for a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'List of modules' })
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.moduleService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', description: 'Module UUID' })
  @ApiResponse({ status: 200, description: 'Module details' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Module UUID' })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleSwaggerDto,
  ) {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Put('course/:courseId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder modules in a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Modules reordered successfully' })
  async reorder(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() body: { moduleIds: string[] },
  ) {
    return this.moduleService.reorder(courseId, body.moduleIds);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', description: 'Module UUID' })
  @ApiResponse({ status: 204, description: 'Module deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleService.remove(id);
  }
}
