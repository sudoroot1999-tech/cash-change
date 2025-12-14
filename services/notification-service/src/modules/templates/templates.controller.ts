import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { NotificationTemplate } from './entities/template.entity';

@ApiTags('Templates')
@Controller('templates')
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  async findAll(): Promise<{ data: NotificationTemplate[] }> {
    return { data: await this.templatesService.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create template' })
  async create(@Body() data: Partial<NotificationTemplate>) {
    return this.templatesService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: Partial<NotificationTemplate>) {
    return this.templatesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.delete(id);
  }
}
