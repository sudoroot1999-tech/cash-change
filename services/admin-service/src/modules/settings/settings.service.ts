import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
  ) {}

  async findAll() {
    return this.settingsRepository.find({
      order: { key: 'ASC' },
    });
  }

  async findByKey(key: string): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting ${key} not found`);
    }
    return setting;
  }

  async getValue(key: string, defaultValue?: any): Promise<any> {
    try {
      const setting = await this.findByKey(key);
      return this.parseValue(setting.value, setting.type);
    } catch {
      return defaultValue;
    }
  }

  async setValue(key: string, value: any, description?: string, type?: string) {
    let setting = await this.settingsRepository.findOne({ where: { key } });

    const valueType = type || this.inferType(value);
    const stringValue = this.stringifyValue(value, valueType);

    if (setting) {
      setting.value = stringValue;
      if (description) setting.description = description;
      if (type) setting.type = valueType as any;
    } else {
      setting = this.settingsRepository.create({
        key,
        value: stringValue,
        description,
        type: valueType as any,
      });
    }

    return this.settingsRepository.save(setting);
  }

  async delete(key: string) {
    const setting = await this.findByKey(key);
    await this.settingsRepository.remove(setting);
  }

  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private stringifyValue(value: any, type: string): string {
    switch (type) {
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  private inferType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    return 'string';
  }
}

