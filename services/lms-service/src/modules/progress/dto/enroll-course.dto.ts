import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

@InputType('EnrollCourseInput')
export class EnrollCourseDto {
  @ApiProperty()
  @Field()
  @IsUUID()
  courseId: string;
}
