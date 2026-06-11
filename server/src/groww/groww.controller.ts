import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { GrowwService } from './groww.service';
import {
    AuthenticateDto,
    TOTPAuthenticateDto,
    AccountSelectionDto,
    AuthSuccessResponseDto,
    StatusResponseDto,
} from './dto/groww.dto';

@Controller('api/groww')
export class GrowwController {
    constructor(private readonly growwService: GrowwService) { }

    @Post('auth/api-key')
    @HttpCode(HttpStatus.OK)
    async authenticateWithApiKey(@Body() dto: AuthenticateDto): Promise<AuthSuccessResponseDto> {
        await this.growwService.authenticateWithApiKey(dto.apiKey, dto.apiSecret, dto.accountName);
        return {
            success: true,
            message: `${dto.accountName} account authenticated successfully`,
            accountName: dto.accountName,
        };
    }

    @Post('auth/totp')
    @HttpCode(HttpStatus.OK)
    async authenticateWithTOTP(@Body() dto: TOTPAuthenticateDto): Promise<AuthSuccessResponseDto> {
        await this.growwService.authenticateWithTOTP(dto.apiKey, dto.totp, dto.accountName);
        return {
            success: true,
            message: `${dto.accountName} account authenticated successfully with TOTP`,
            accountName: dto.accountName,
        };
    }

    @Get('status')
    @HttpCode(HttpStatus.OK)
    getStatus(): StatusResponseDto {
        const accounts = this.growwService.getAllAccountsStatus();
        const isConnected = accounts.some(acc => acc.isConnected);
        return {
            isConnected,
            accounts,
        };
    }

    @Get('holdings')
    @HttpCode(HttpStatus.OK)
    async getHoldings(@Query('accountName') accountName?: string) {
        if (accountName) {
            return await this.growwService.fetchHoldings(accountName);
        }
        return await this.growwService.fetchAllHoldings();
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(@Body() dto?: AccountSelectionDto): AuthSuccessResponseDto {
        if (dto?.accountName) {
            this.growwService.clearToken(dto.accountName);
            return {
                success: true,
                message: `Disconnected ${dto.accountName} account from Groww`,
            };
        }

        this.growwService.clearAllTokens();
        return {
            success: true,
            message: 'Disconnected all accounts from Groww',
        };
    }
}
