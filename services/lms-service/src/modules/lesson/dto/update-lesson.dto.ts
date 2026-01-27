import { InputType, PartialType, OmitType } from '@nestjs/graphql';
import { PartialType as SwaggerPartialType, OmitType as SwaggerOmitType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';

@InputType('UpdateLessonInput')
export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['moduleId', 'courseId'] as const),
) {}

export class UpdateLessonSwaggerDto extends SwaggerPartialType(
  SwaggerOmitType(CreateLessonDto, ['moduleId', 'courseId'] as const),
) {}
