import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';
import { PostVisibility } from '../../../database/entities';

@InputType()
export class UpdatePostDto {
  @ApiPropertyOptional({ enum: PostVisibility })
  @Field(() => PostVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ maxLength: 5000 })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}
