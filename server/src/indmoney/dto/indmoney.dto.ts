import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class IndMoneyAuthDto {
    @IsNotEmpty()
    @IsString()
    bearerToken: string;

    @IsNotEmpty()
    @IsString()
    accountName: string;
}

export class IndMoneySyncDto {
    @IsOptional()
    @IsNumber()
    conversionRate?: number;
}

export class AccountSelectionDto {
    @IsOptional()
    @IsString()
    accountName?: string;
}

export class AuthSuccessResponseDto {
    success: boolean;
    message: string;
    accountName?: string;
}

export class AccountStatusDto {
    accountName: string;
    isConnected: boolean;
    tokenExpiresAt?: string;
}

export class StatusResponseDto {
    isConnected: boolean;
    accounts: AccountStatusDto[];
}
