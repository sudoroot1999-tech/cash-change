import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetAntiPhishingCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  phishingCode: string;
}

export class VerifyAntiPhishingCodeDto {
  @IsString()
  code: string;
}
