import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType, Int, ArgsType } from '@nestjs/graphql';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

@InputType('PaginationInput')
@ArgsType()
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @Field({ nullable: true, defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }
}
