import { InputType, PartialType } from '@nestjs/graphql';
import { PartialType as SwaggerPartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

@InputType('UpdateCourseInput')
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class UpdateCourseSwaggerDto extends SwaggerPartialType(CreateCourseDto) {}
