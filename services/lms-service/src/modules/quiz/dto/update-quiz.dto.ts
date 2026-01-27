import { InputType, PartialType } from '@nestjs/graphql';
import { PartialType as SwaggerPartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';

@InputType('UpdateQuizInput')
export class UpdateQuizDto extends PartialType(CreateQuizDto) {}

export class UpdateQuizSwaggerDto extends SwaggerPartialType(CreateQuizDto) {}
