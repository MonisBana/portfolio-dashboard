import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ZerodhaService } from './zerodha.service';
import {
    CallbackDto,
    AccountSelectionDto,
    LoginUrlResponseDto,
    StatusResponseDto,
    AuthSuccessResponseDto,
} from './dto/zerodha.dto';

@Controller('api/zerodha')
export class ZerodhaController {
    constructor(private readonly zerodhaService: ZerodhaService) { }

    @Get('login-url')
    @HttpCode(HttpStatus.OK)
    getLoginUrl(@Query('accountName') accountName?: string): LoginUrlResponseDto {
        const url = this.zerodhaService.getLoginUrl(accountName || 'Self');
        return { url };
    }

    @Post('auth/callback')
    @HttpCode(HttpStatus.OK)
    async handleCallback(@Body() dto: CallbackDto): Promise<AuthSuccessResponseDto> {
        await this.zerodhaService.generateAccessToken(dto.requestToken, dto.accountName);
        return {
            success: true,
            message: 'Authentication successful'
        };
    }

    @Get('status')
    @HttpCode(HttpStatus.OK)
    getStatus(): StatusResponseDto {
        const accounts = this.zerodhaService.getAllAccountsStatus();
        return {
            isConnected: accounts.some(account => account.isConnected),
            accounts,
        };
    }

    @Get('holdings')
    @HttpCode(HttpStatus.OK)
    async getHoldings(@Query('accountName') accountName?: string) {
        if (accountName) {
            return await this.zerodhaService.fetchHoldings(accountName);
        }
        return await this.zerodhaService.fetchAllHoldings();
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(@Body() dto?: AccountSelectionDto): AuthSuccessResponseDto {
        this.zerodhaService.clearToken(dto?.accountName);
        return {
            success: true,
            message: dto?.accountName
                ? `Disconnected ${dto.accountName} from Zerodha`
                : 'Disconnected from Zerodha'
        };
    }
}
