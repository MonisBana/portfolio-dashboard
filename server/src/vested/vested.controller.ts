import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { VestedService } from './vested.service';
import { VestedAuthDto, VestedAuthSuccessResponseDto, VestedStatusResponseDto } from './dto/vested.dto';

@Controller('api/vested')
export class VestedController {
    constructor(private readonly vestedService: VestedService) { }

    @Post('auth')
    @HttpCode(HttpStatus.OK)
    authenticate(@Body() dto: VestedAuthDto): VestedAuthSuccessResponseDto {
        this.vestedService.setToken(dto.bearerToken, dto.csrfToken, dto.cookie);
        return {
            success: true,
            message: 'Vested account token saved successfully',
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
        @Query('conversionRate') conversionRate?: string,
    ) {
        const rate = conversionRate ? parseFloat(conversionRate) : 1;
        return await this.vestedService.fetchHoldings(rate);
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.OK)
    disconnect(): VestedAuthSuccessResponseDto {
        this.vestedService.disconnect();
        return {
            success: true,
            message: 'Disconnected from Vested',
        };
    }
}
