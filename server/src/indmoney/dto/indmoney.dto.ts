import { IsNotEmpty, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class IndMoneyAuthDto {
    @IsNotEmpty()
    @IsString()
    bearerToken: string;

    @IsNotEmpty()
    @IsIn(['Self', 'Wife'])
    accountName: string;
}

export class IndMoneySyncDto {
    @IsOptional()
    @IsNumber()
    conversionRate?: number;
}

export class AccountSelectionDto {
    @IsOptional()
    @IsIn(['Self', 'Wife'])
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
