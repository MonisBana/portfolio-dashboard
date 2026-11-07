import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CallbackDto {
    @IsString()
    @IsNotEmpty()
    requestToken: string;

    @IsOptional()
    @IsString()
    accountName?: string;
}

export class AccountSelectionDto {
    @IsOptional()
    @IsString()
    accountName?: string;
}

export class LoginUrlResponseDto {
    url: string;
}

export class StatusResponseDto {
    isConnected: boolean;
    accounts: {
        accountName: string;
        isConnected: boolean;
    }[];
}

export class AuthSuccessResponseDto {
    success: boolean;
    message: string;
}
