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
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizType, QuestionType } from '../../../database/entities/quiz.entity';

@InputType('QuizQuestionInput')
class QuizQuestionDto {
  @ApiProperty()
  @Field()
  @IsString()
  id: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ enum: QuestionType })
  @Field(() => String)
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiProperty({ type: [String] })
  @Field(() => [String])
  @IsArray()
  correctAnswer: string[];

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ default: 1 })
  @Field(() => Int, { defaultValue: 1 })
  @IsNumber()
  @Min(1)
  points: number;
}

@InputType('CreateQuizInput')
export class CreateQuizDto {
  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ enum: QuizType })
  @Field(() => String)
  @IsEnum(QuizType)
  type: QuizType;

  @ApiProperty({ type: [QuizQuestionDto] })
  @Field(() => [QuizQuestionDto])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];

  @ApiPropertyOptional()
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({ default: 70 })
  @Field(() => Int, { nullable: true, defaultValue: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ default: 3 })
  @Field(() => Int, { nullable: true, defaultValue: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  attemptsAllowed?: number;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @ApiPropertyOptional({ default: 50 })
  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  xpReward?: number;
}
