import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLevel, CourseCategory } from '../../../database/entities/course.entity';

class InstructorDto {
  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;
}

class CourseCertificateDto {
  @ApiProperty()
  @Field()
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ default: 70 })
  @Field(() => Int, { defaultValue: 70 })
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;
}

class CourseSeoDto {
  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  keywords?: string[];
}

class CourseResourceDto {
  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @Field()
  @IsString()
  type: string;

  @ApiProperty()
  @Field()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  size?: number;
}

@InputType('CreateCourseInput')
export class CreateCourseDto {
  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ maxLength: 200 })
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  shortDescription: string;

  @ApiProperty({ enum: CourseCategory })
  @Field(() => String)
  @IsEnum(CourseCategory)
  category: CourseCategory;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  subcategory: string;

  @ApiProperty({ type: InstructorDto })
  @Field(() => InstructorDto)
  @ValidateNested()
  @Type(() => InstructorDto)
  instructor: InstructorDto;

  @ApiProperty()
  @Field()
  @IsString()
  thumbnail: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  previewVideo?: string;

  @ApiProperty({ enum: CourseLevel })
  @Field(() => String)
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({ description: 'Duration in minutes' })
  @Field(() => Int)
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ default: 'en' })
  @Field({ nullable: true, defaultValue: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  requirements?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  learningObjectives?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @ApiPropertyOptional({ default: 0 })
  @Field(() => Float, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiPropertyOptional({ default: false })
  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ type: CourseCertificateDto })
  @Field(() => CourseCertificateDto, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseCertificateDto)
  certificate?: CourseCertificateDto;

  @ApiPropertyOptional({ type: CourseSeoDto })
  @Field(() => CourseSeoDto, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseSeoDto)
  seo?: CourseSeoDto;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ type: [CourseResourceDto] })
  @Field(() => [CourseResourceDto], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseResourceDto)
  resources?: CourseResourceDto[];
}

// Register nested types for GraphQL
InputType('InstructorInput')(InstructorDto);
InputType('CourseCertificateInput')(CourseCertificateDto);
InputType('CourseSeoInput')(CourseSeoDto);
InputType('CourseResourceInput')(CourseResourceDto);
