import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { IndMoneyService } from './indmoney.service';
import { IndMoneyAuthDto, AccountSelectionDto, AuthSuccessResponseDto, StatusResponseDto } from './dto/indmoney.dto';

@Controller('api/indmoney')
export class IndMoneyController {
    constructor(private readonly indMoneyService: IndMoneyService) { }

    @Post('auth')
    @HttpCode(HttpStatus.OK)
    authenticate(@Body() dto: IndMoneyAuthDto): AuthSuccessResponseDto {
        this.indMoneyService.setToken(dto.bearerToken, dto.accountName);
        return {
            success: true,
            message: `${dto.accountName} account token saved successfully`,
            accountName: dto.accountName,
        };
    }

    @Get('status')
    @HttpCode(HttpStatus.OK)
    getStatus(): StatusResponseDto {
        return this.indMoneyService.getStatus();
    }

    @Get('holdings')
    @HttpCode(HttpStatus.OK)
    async getHoldings(
        @Query('accountName') accountName?: string,
        @Query('conversionRate') conversionRate?: string,
    ) {
        const rate = conversionRate ? parseFloat(conversionRate) : 1;
        if (accountName) {
            return await this.indMoneyService.fetchHoldings(accountName, rate);
        }
        return await this.indMoneyService.fetchAllHoldings(rate);
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(@Body() dto?: AccountSelectionDto): AuthSuccessResponseDto {
        if (dto?.accountName) {
            this.indMoneyService.disconnect(dto.accountName);
            return {
                success: true,
                message: `Disconnected ${dto.accountName} account from INDMoney`,
                accountName: dto.accountName,
            };
        }

        this.indMoneyService.disconnect();
        return {
            success: true,
            message: 'Disconnected all accounts from INDMoney',
        };
    }
}
