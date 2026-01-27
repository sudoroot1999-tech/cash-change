import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ModuleService } from './module.service';
import { Module } from '../../database/entities/module.entity';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@Resolver(() => Module)
export class ModuleResolver {
  constructor(private readonly moduleService: ModuleService) {}

  @Mutation(() => Module)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createModule(@Args('input') createModuleDto: CreateModuleDto): Promise<Module> {
    return this.moduleService.create(createModuleDto);
  }

  @Query(() => [Module], { name: 'modulesByCourse' })
  async findByCourse(@Args('courseId', { type: () => ID }) courseId: string): Promise<Module[]> {
    return this.moduleService.findByCourse(courseId);
  }

  @Query(() => Module, { name: 'module' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Module> {
    return this.moduleService.findOne(id);
  }

  @Mutation(() => Module)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async updateModule(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateModuleDto: UpdateModuleDto,
  ): Promise<Module> {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Mutation(() => [Module])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async reorderModules(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('moduleIds', { type: () => [ID] }) moduleIds: string[],
  ): Promise<Module[]> {
    return this.moduleService.reorder(courseId, moduleIds);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteModule(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.moduleService.remove(id);
    return true;
  }
}
