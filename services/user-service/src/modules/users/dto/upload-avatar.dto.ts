import { ApiProperty } from "@nestjs/swagger";

export class UploadAvatarResponseDto {
  @ApiProperty({ description: 'Avatar URL' })
  avatarUrl: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
