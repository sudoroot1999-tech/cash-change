import { IsString, IsOptional, IsArray, IsEnum, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field, InputType } from '@nestjs/graphql';
import { ConversationType } from '../../../database/entities';

@InputType()
export class CreateConversationDto {
  @ApiProperty({ enum: ConversationType })
  @Field(() => ConversationType)
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ type: [String] })
  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];
}
