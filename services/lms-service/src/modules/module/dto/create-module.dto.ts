import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsUUID, Min } from 'class-validator';

@InputType('CreateModuleInput')
export class CreateModuleDto {
  @ApiProperty()
  @Field()
  @IsUUID()
  courseId: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @Field(() => Int)
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ default: 0 })
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ default: false })
  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
