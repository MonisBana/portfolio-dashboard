import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { VestedService } from './vested.service';
import {
    VestedAuthDto,
    AccountSelectionDto,
    VestedAuthSuccessResponseDto,
    VestedStatusResponseDto,
} from './dto/vested.dto';

@Controller('api/vested')
export class VestedController {
    constructor(private readonly vestedService: VestedService) { }

    @Post('auth')
    @HttpCode(HttpStatus.OK)
    authenticate(@Body() dto: VestedAuthDto): VestedAuthSuccessResponseDto {
        const accountName = dto.accountName || 'Self';
        this.vestedService.setToken(dto.bearerToken, dto.csrfToken, dto.cookie, accountName);
        return {
            success: true,
            message: `${accountName} account token saved successfully`,
            accountName,
        };
    }

    @Get('status')
    @HttpCode(HttpStatus.OK)
    getStatus(): VestedStatusResponseDto {
        return this.vestedService.getStatus();
    }

    @Get('holdings')
    @HttpCode(HttpStatus.OK)
    async getHoldings(
        @Query('accountName') accountName?: string,
        @Query('conversionRate') conversionRate?: string,
    ) {
        const rate = conversionRate ? parseFloat(conversionRate) : 1;
        if (accountName) {
            return await this.vestedService.fetchHoldings(rate, accountName);
        }
        return await this.vestedService.fetchAllHoldings(rate);
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(@Body() dto?: AccountSelectionDto): VestedAuthSuccessResponseDto {
        this.vestedService.disconnect(dto?.accountName);
        return {
            success: true,
            message: dto?.accountName
                ? `Disconnected ${dto.accountName} from Vested`
                : 'Disconnected all accounts from Vested',
            accountName: dto?.accountName,
        };
    }
}
