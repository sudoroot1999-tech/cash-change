import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateService } from './templates.service';
import { RequireAuth } from '@exchange/common';

@ApiTags('Templates')
@Controller('templates')
@RequireAuth()
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplateService) {}


  @Get('templates')
  @ApiOperation({ summary: 'List all notification templates' })
  async listTemplates() {
    const templates = await this.templatesService.listTemplates();
    return {
      success: true,
      data: templates,
    };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.templatesService.getTemplate(id);
    return {
      success: true,
      data: template,
    };
  }
}
