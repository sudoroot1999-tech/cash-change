import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';
import { PostType, PostVisibility } from '../../../database/entities';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreatePostDto {
  @ApiPropertyOptional({ enum: PostType, default: PostType.TEXT })
  @Field(() => PostType, { nullable: true, defaultValue: PostType.TEXT })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional({ enum: PostVisibility, default: PostVisibility.PUBLIC })
  @Field(() => PostVisibility, { nullable: true, defaultValue: PostVisibility.PUBLIC })
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
  mediaUrls?: string[];

  @ApiPropertyOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  tradeData?: Record<string, any>;

  @ApiPropertyOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  pollData?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sharedPostId?: string;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}
