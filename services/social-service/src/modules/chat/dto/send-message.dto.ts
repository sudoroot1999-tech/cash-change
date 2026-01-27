import { IsString, IsOptional, IsArray, IsEnum, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';
import { MessageType } from '../../../database/entities';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @Field(() => MessageType, { nullable: true, defaultValue: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ maxLength: 10000 })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
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
  fileInfo?: Record<string, any>;

  @ApiPropertyOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  tradeData?: Record<string, any>;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}
