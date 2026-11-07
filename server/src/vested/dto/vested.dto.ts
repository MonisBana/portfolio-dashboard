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

    @IsOptional()
    @IsString()
    accountName?: string;
}

export class AccountSelectionDto {
    @IsOptional()
    @IsString()
    accountName?: string;
}

export class VestedSyncDto {
    @IsOptional()
    @IsNumber()
    conversionRate?: number;
}

export class AccountStatusDto {
    accountName: string;
    isConnected: boolean;
    tokenExpiresAt?: string;
}

export class VestedAuthSuccessResponseDto {
    success: boolean;
    message: string;
    accountName?: string;
}

export class VestedStatusResponseDto {
    isConnected: boolean;
    accounts: AccountStatusDto[];
    tokenExpiresAt?: string;
}
