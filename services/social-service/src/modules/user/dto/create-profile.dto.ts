import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateProfileDto {
  @ApiProperty({ minLength: 3, maxLength: 50 })
  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

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
  website?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ default: true })
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
