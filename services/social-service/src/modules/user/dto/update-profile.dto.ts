import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowCopyTrading?: boolean;

  @ApiPropertyOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
