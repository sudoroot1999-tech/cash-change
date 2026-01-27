import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { PartialType as SwaggerPartialType, OmitType as SwaggerOmitType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';

@InputType('UpdateModuleInput')
export class UpdateModuleDto extends PartialType(OmitType(CreateModuleDto, ['courseId'] as const)) {}

export class UpdateModuleSwaggerDto extends SwaggerPartialType(
  SwaggerOmitType(CreateModuleDto, ['courseId'] as const),
) {}
