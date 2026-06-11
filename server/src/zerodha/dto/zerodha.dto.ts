import { IsString, IsNotEmpty } from 'class-validator';

export class CallbackDto {
    @IsString()
    @IsNotEmpty()
    requestToken: string;
}

export class LoginUrlResponseDto {
    url: string;
}

export class StatusResponseDto {
    isConnected: boolean;
}

export class AuthSuccessResponseDto {
    success: boolean;
    message: string;
}
