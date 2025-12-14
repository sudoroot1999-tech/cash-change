import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import { NotificationTemplate } from './entities/template.entity';

@Injectable()
export class TemplatesService {
  constructor(@InjectRepository(NotificationTemplate) private readonly templateRepo: Repository<NotificationTemplate>) {}

  async findAll(): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findByName(name: string): Promise<NotificationTemplate | null> {
    return this.templateRepo.findOne({ where: { name, isActive: true } });
  }

  async findById(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async render(templateName: string, variables: Record<string, string>): Promise<{ subject: string | null; body: string }> {
    const template = await this.findByName(templateName);
    if (!template) throw new NotFoundException('Template not found');

    const bodyTemplate = Handlebars.compile(template.body);
    const body = bodyTemplate(variables);

    let subject: string | null = null;
    if (template.subject) {
      const subjectTemplate = Handlebars.compile(template.subject);
      subject = subjectTemplate(variables);
    }

    return { subject, body };
  }

  async create(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  async update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = await this.findById(id);
    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async delete(id: string): Promise<void> {
    await this.templateRepo.delete(id);
  }
}
