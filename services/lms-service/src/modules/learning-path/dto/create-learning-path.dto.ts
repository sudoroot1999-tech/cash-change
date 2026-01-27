import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LearningPathLevel } from '../../../database/entities/learning-path.entity';

@InputType('LearningPathCourseInput')
class LearningPathCourseDto {
  @ApiProperty() @Field() @IsString() courseId: string;
  @ApiProperty() @Field(() => Int) @IsNumber() order: number;
  @ApiPropertyOptional() @Field({ nullable: true, defaultValue: false }) @IsOptional() @IsBoolean() isOptional?: boolean;
}

@InputType('CreateLearningPathInput')
export class CreateLearningPathDto {
  @ApiProperty() @Field() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @Field() @IsString() @IsNotEmpty() description: string;
  @ApiPropertyOptional() @Field({ nullable: true }) @IsOptional() @IsString() thumbnail?: string;
  @ApiProperty() @Field() @IsString() category: string;
  @ApiProperty({ enum: LearningPathLevel }) @Field(() => String) @IsEnum(LearningPathLevel) level: LearningPathLevel;
  @ApiProperty({ type: [LearningPathCourseDto] }) @Field(() => [LearningPathCourseDto]) @IsArray() @ValidateNested({ each: true }) @Type(() => LearningPathCourseDto) courses: LearningPathCourseDto[];
  @ApiProperty() @Field(() => Int) @IsNumber() @Min(1) duration: number;
  @ApiPropertyOptional({ type: [String] }) @Field(() => [String], { nullable: true }) @IsOptional() @IsArray() skillsGained?: string[];
  @ApiPropertyOptional() @Field({ nullable: true, defaultValue: false }) @IsOptional() @IsBoolean() isPublished?: boolean;
  @ApiPropertyOptional() @Field({ nullable: true, defaultValue: false }) @IsOptional() @IsBoolean() featured?: boolean;
}
