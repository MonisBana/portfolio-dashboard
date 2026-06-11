import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AuthenticateDto {
    @IsNotEmpty()
    @IsString()
    apiKey: string;

    @IsNotEmpty()
    @IsString()
    apiSecret: string;

    @IsNotEmpty()
    @IsIn(['Self', 'Wife'])
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
    @IsIn(['Self', 'Wife'])
    accountName: string;
}

export class AccountSelectionDto {
    @IsNotEmpty()
    @IsIn(['Self', 'Wife'])
    accountName: string;
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
