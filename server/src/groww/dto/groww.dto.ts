import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AuthenticateDto {
    @IsNotEmpty()
    @IsString()
    apiKey: string;

    @IsNotEmpty()
    @IsString()
    apiSecret: string;

    @IsNotEmpty()
    @IsString()
    accountName: string;
}

export class TOTPAuthenticateDto {
    @IsNotEmpty()
    @IsString()
    apiKey: string;

    @IsNotEmpty()
    @IsString()
    totp: string;

    @IsNotEmpty()
    @IsString()
    accountName: string;
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

export class StatusResponseDto {
    isConnected: boolean;
    accounts: {
        accountName: string;
        isConnected: boolean;
    }[];
}

export class AccountStatusDto {
    accountName: string;
    isConnected: boolean;
}
