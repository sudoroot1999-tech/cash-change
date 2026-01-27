import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested, IsNumber, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('QuizAnswerInput')
class QuizAnswerDto {
  @ApiProperty()
  @Field()
  @IsString()
  questionId: string;

  @ApiProperty({ type: [String] })
  @Field(() => [String])
  @IsArray()
  answer: string[];
}

@InputType('SubmitQuizInput')
export class SubmitQuizDto {
  @ApiProperty({ type: [QuizAnswerDto] })
  @Field(() => [QuizAnswerDto])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @ApiPropertyOptional()
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @ApiProperty()
  @Field()
  @Type(() => Date)
  @IsDate()
  startedAt: Date;
}
