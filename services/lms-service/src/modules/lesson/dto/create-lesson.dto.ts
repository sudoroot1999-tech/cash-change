import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType, VideoPlatform, CompletionCriteriaType } from '../../../database/entities/lesson.entity';

@InputType('CodeSnippetInput')
class CodeSnippetDto {
  @ApiProperty()
  @Field()
  @IsString()
  language: string;

  @ApiProperty()
  @Field()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType('LessonContentInput')
class LessonContentDto {
  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ enum: VideoPlatform })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(VideoPlatform)
  videoPlatform?: VideoPlatform;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiPropertyOptional()
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  videoDuration?: number;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  articleContent?: string;

  @ApiPropertyOptional({ type: [CodeSnippetDto] })
  @Field(() => [CodeSnippetDto], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeSnippetDto)
  codeSnippets?: CodeSnippetDto[];
}

@InputType('LessonResourceInput')
class LessonResourceDto {
  @ApiProperty()
  @Field()
  @IsString()
  title: string;

  @ApiProperty()
  @Field()
  @IsString()
  url: string;

  @ApiProperty()
  @Field()
  @IsString()
  type: string;
}

@InputType('CompletionCriteriaInput')
class CompletionCriteriaDto {
  @ApiProperty({ enum: CompletionCriteriaType })
  @Field(() => String)
  @IsEnum(CompletionCriteriaType)
  type: CompletionCriteriaType;

  @ApiPropertyOptional()
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  requiredScore?: number;
}

@InputType('CreateLessonInput')
export class CreateLessonDto {
  @ApiProperty()
  @Field()
  @IsUUID()
  moduleId: string;

  @ApiProperty()
  @Field()
  @IsUUID()
  courseId: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @Field(() => Int)
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ enum: LessonType })
  @Field(() => String)
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({ type: LessonContentDto })
  @Field(() => LessonContentDto, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LessonContentDto)
  content?: LessonContentDto;

  @ApiPropertyOptional({ type: [LessonResourceDto] })
  @Field(() => [LessonResourceDto], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonResourceDto)
  resources?: LessonResourceDto[];

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  quizId?: string;

  @ApiPropertyOptional({ default: 0 })
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ default: 100 })
  @Field(() => Int, { nullable: true, defaultValue: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({ default: false })
  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ type: CompletionCriteriaDto })
  @Field(() => CompletionCriteriaDto, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompletionCriteriaDto)
  completionCriteria?: CompletionCriteriaDto;
}
