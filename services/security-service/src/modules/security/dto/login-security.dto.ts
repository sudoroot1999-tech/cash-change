import { IsIP, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateSessionDto {
    @IsString()
    userId: string;

    @IsString()
    @IsOptional()
    sessionToken?: string;

    @IsString()
    @IsOptional()
    refreshToken?: string;

    @IsString()
    @IsOptional()
    deviceFingerprint?: string;

    @IsIP()
    ipAddress: string;

    @IsString()
    @IsOptional()
    userAgent?: string;

    @IsOptional()
    metadata?: any;

    @IsNumber()
    @IsOptional()
    expiresInHours?: number;
}
