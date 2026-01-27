import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, IsString, Min } from 'class-validator';

@InputType('CompleteLessonInput')
export class CompleteLessonDto {
  @ApiPropertyOptional()
  @Field()
  @IsUUID()
  lessonId: string;

  @ApiPropertyOptional({ default: 0 })
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;
}

@InputType('AddNoteInput')
export class AddNoteDto {
  @ApiPropertyOptional()
  @Field()
  @IsUUID()
  lessonId: string;

  @ApiPropertyOptional()
  @Field()
  @IsString()
  note: string;
}

@InputType('AddBookmarkInput')
export class AddBookmarkDto {
  @ApiPropertyOptional()
  @Field()
  @IsUUID()
  lessonId: string;

  @ApiPropertyOptional()
  @Field(() => Int)
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType('UpdateProgressInput')
export class UpdateProgressDto {
  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  currentLesson?: string;
}
