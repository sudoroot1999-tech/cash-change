import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Module } from '../../entities/module.entity';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(createModuleDto: CreateModuleDto): Promise<Module> {
    const module = this.moduleRepository.create(createModuleDto);
    const savedModule = await this.moduleRepository.save(module);
    await this.invalidateCache(createModuleDto.courseId);
    return savedModule;
  }

  async findByCourse(courseId: string): Promise<Module[]> {
    const cacheKey = `modules:course:${courseId}`;
    const cached = await this.cacheManager.get<Module[]>(cacheKey);
    if (cached) return cached;

    const modules = await this.moduleRepository.find({
      where: { courseId },
      relations: ['lessons'],
      order: { order: 'ASC' },
    });

    await this.cacheManager.set(cacheKey, modules, 300000);
    return modules;
  }

  async findOne(id: string): Promise<Module> {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['lessons'],
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  async update(id: string, updateModuleDto: UpdateModuleDto): Promise<Module> {
    const module = await this.findOne(id);
    Object.assign(module, updateModuleDto);
    const updatedModule = await this.moduleRepository.save(module);
    await this.invalidateCache(module.courseId);
    return updatedModule;
  }

  async remove(id: string): Promise<void> {
    const module = await this.findOne(id);
    const courseId = module.courseId;
    await this.moduleRepository.remove(module);
    await this.invalidateCache(courseId);
  }

  async reorder(courseId: string, moduleIds: string[]): Promise<Module[]> {
    const modules = await this.findByCourse(courseId);
    
    for (let i = 0; i < moduleIds.length; i++) {
      const module = modules.find(m => m.id === moduleIds[i]);
      if (module) {
        module.order = i;
        await this.moduleRepository.save(module);
      }
    }

    await this.invalidateCache(courseId);
    return this.findByCourse(courseId);
  }

  private async invalidateCache(courseId: string): Promise<void> {
    await this.cacheManager.del(`modules:course:${courseId}`);
  }
}
