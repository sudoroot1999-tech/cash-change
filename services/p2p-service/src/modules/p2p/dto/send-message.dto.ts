import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '../entities/trade-message.entity';

export class SendMessageDto {
  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}
