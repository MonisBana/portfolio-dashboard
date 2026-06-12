import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class VestedAuthDto {
    @IsNotEmpty()
    @IsString()
    bearerToken: string;

    @IsOptional()
    @IsString()
    csrfToken?: string;

    @IsOptional()
    @IsString()
    cookie?: string;
}

export class VestedSyncDto {
    @IsOptional()
    @IsNumber()
    conversionRate?: number;
}

export class VestedAuthSuccessResponseDto {
    success: boolean;
    message: string;
}

export class VestedStatusResponseDto {
    isConnected: boolean;
    tokenExpiresAt?: string;
}
