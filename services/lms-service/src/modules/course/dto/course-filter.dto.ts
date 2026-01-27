import { InputType, Field, ArgsType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { CourseLevel, CourseCategory } from '../../../database/entities/course.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@InputType('CourseFilterInput')
@ArgsType()
export class CourseFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CourseCategory })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @ApiPropertyOptional({ enum: CourseLevel })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  instructorId?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  tag?: string;
}
