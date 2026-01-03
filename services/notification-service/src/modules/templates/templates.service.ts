import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/template.entity';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {
    this.registerHelpers();
  }

  private registerHelpers() {
    // Register custom Handlebars helpers
    Handlebars.registerHelper('currency', function(value: number) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    });

    Handlebars.registerHelper('date', function(date: Date, format: string) {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('uppercase', function(str: string) {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('lowercase', function(str: string) {
      return str.toLowerCase();
    });
  }

  async renderTemplate(
    templateId: string,
    data: Record<string, any>,
    channel: 'email' | 'sms' | 'push',
  ): Promise<{ subject?: string; content: string }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let templateString: string;
    switch (channel) {
      case 'email':
        templateString = template.template;
        break;
      case 'sms':
        templateString = template.smsTemplate || template.template;
        break;
      case 'push':
        templateString = template.pushTemplate || template.template;
        break;
      default:
        templateString = template.template;
    }

    const compiled = this.compileTemplate(templateId, templateString);
    const content = compiled(data);

    const result: { subject?: string; content: string } = { content };

    if (channel === 'email' && template.subject) {
      const subjectCompiled = Handlebars.compile(template.subject);
      result.subject = subjectCompiled(data);
    }

    return result;
  }

  private compileTemplate(templateId: string, templateString: string): HandlebarsTemplateDelegate {
    const cacheKey = `${templateId}-${templateString}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    const compiled = Handlebars.compile(templateString);
    this.templateCache.set(cacheKey, compiled);
    return compiled;
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { id: templateId, isActive: true },
    });
  }

  async getTemplateByName(name: string): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { name, isActive: true },
    });
  }

  async createTemplate(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(templateData);
    return this.templateRepository.save(template);
  }

  async updateTemplate(id: string, templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.templateRepository.update(id, templateData);
    return this.getTemplate(id);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templateRepository.update(id, { isActive: false });
  }

  async listTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }
}
