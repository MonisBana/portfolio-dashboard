import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ZerodhaService } from './zerodha.service';
import { CallbackDto, LoginUrlResponseDto, StatusResponseDto, AuthSuccessResponseDto } from './dto/zerodha.dto';

@Controller('api/zerodha')
export class ZerodhaController {
    constructor(private readonly zerodhaService: ZerodhaService) { }

    @Get('login-url')
    @HttpCode(HttpStatus.OK)
    getLoginUrl(): LoginUrlResponseDto {
        const url = this.zerodhaService.getLoginUrl();
        return { url };
    }

    @Post('auth/callback')
    @HttpCode(HttpStatus.OK)
    async handleCallback(@Body() dto: CallbackDto): Promise<AuthSuccessResponseDto> {
        await this.zerodhaService.generateAccessToken(dto.requestToken);
        return {
            success: true,
            message: 'Authentication successful'
        };
    }

    @Get('status')
    @HttpCode(HttpStatus.OK)
    getStatus(): StatusResponseDto {
        const isConnected = this.zerodhaService.isTokenValid();
        return { isConnected };
    }

    @Get('holdings')
    @HttpCode(HttpStatus.OK)
    async getHoldings() {
        return await this.zerodhaService.fetchHoldings();
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(): AuthSuccessResponseDto {
        this.zerodhaService.clearToken();
        return {
            success: true,
            message: 'Disconnected from Zerodha'
        };
    }
}
