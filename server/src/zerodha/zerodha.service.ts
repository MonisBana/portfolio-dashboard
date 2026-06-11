import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { KiteConnect } from 'kiteconnect';
import type { Connect, PortfolioHolding } from 'kiteconnect';
import { PortfolioItem } from './interfaces/zerodha.interface';

@Injectable()
export class ZerodhaService {
    private readonly logger = new Logger(ZerodhaService.name);
    private kiteConnect: Connect;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        const apiKey = process.env.ZERODHA_API_KEY;

        if (!apiKey) {
            throw new Error('ZERODHA_API_KEY is not set in environment variables');
        }

        this.kiteConnect = new KiteConnect({
            api_key: apiKey
        });

        this.logger.log('ZerodhaService initialized');
    }

    getLoginUrl(): string {
        try {
            const loginUrl = this.kiteConnect.getLoginURL();
            this.logger.log(`Generated login URL: ${loginUrl}`);
            return loginUrl;
        } catch (error) {
            this.logger.error('Failed to generate login URL', error);
            throw new InternalServerErrorException('Failed to generate login URL');
        }
    }

    async generateAccessToken(requestToken: string): Promise<void> {
        try {
            const apiSecret = process.env.ZERODHA_API_SECRET;
            if (!apiSecret) {
                throw new Error('ZERODHA_API_SECRET is not set in environment variables');
            }

            this.logger.log('Generating access token...');
            const session = await this.kiteConnect.generateSession(
                requestToken,
                apiSecret
            );

            this.accessToken = session.access_token;
            this.kiteConnect.setAccessToken(this.accessToken);

            // Token expires at end of trading day (11:59 PM)
            this.tokenExpiry = new Date();
            this.tokenExpiry.setHours(23, 59, 59, 999);

            this.logger.log(`Access token generated successfully. Expires at: ${this.tokenExpiry.toISOString()}`);
        } catch (error) {
            this.logger.error('Failed to generate access token', error);
            throw new UnauthorizedException('Failed to authenticate with Zerodha');
        }
    }

    isTokenValid(): boolean {
        const valid = this.accessToken !== null &&
            this.tokenExpiry !== null &&
            new Date() < this.tokenExpiry;

        if (!valid && this.accessToken) {
            this.logger.warn('Token has expired');
        }

        return valid;
    }

    clearToken(): void {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.kiteConnect.setAccessToken('');
        this.logger.log('Token cleared');
    }

    async fetchHoldings(): Promise<PortfolioItem[]> {
        if (!this.isTokenValid()) {
            this.logger.warn('Attempted to fetch holdings with invalid token');
            throw new UnauthorizedException('Token expired or not set');
        }

        try {
            this.logger.log('Fetching holdings from Zerodha...');
            const holdings = await this.kiteConnect.getHoldings();

            this.logger.log(`Fetched ${holdings.length} holdings from Zerodha`);
            return this.mapZerodhaToPortfolio(holdings);
        } catch (error) {
            this.logger.error('Failed to fetch holdings', error);

            if (error.message?.includes('403') || error.message?.includes('401')) {
                this.clearToken();
                throw new UnauthorizedException('Session expired. Please reconnect to Zerodha.');
            }

            throw new InternalServerErrorException('Failed to fetch holdings from Zerodha');
        }
    }

    private mapZerodhaToPortfolio(holdings: PortfolioHolding[]): PortfolioItem[] {
        return holdings.map(h => {
            const currentValue = h.quantity * h.last_price;
            const instrumentType = this.mapInstrumentType(h.product, h.exchange);
            const sector = this.inferSector(h.exchange);

            return {
                symbol: h.tradingsymbol,
                isin: h.isin,
                sector: sector,
                instrumentType: instrumentType,
                quantity: h.quantity,
                averagePrice: h.average_price,
                currentValue: currentValue,
                pnl: h.pnl,
                source: 'Zerodha',
                owner: 'Self'
            };
        });
    }

    private mapInstrumentType(product: string, exchange: string): string {
        if (product === 'CNC') return 'Stocks';
        if (exchange.includes('NFO') || exchange.includes('BFO')) return 'Futures & Options';
        return product || 'Stocks';
    }

    private inferSector(exchange: string): string {
        if (exchange === 'NSE' || exchange === 'BSE') return 'Equity';
        if (exchange.includes('NFO') || exchange.includes('BFO')) return 'Derivatives';
        return 'Unknown';
    }
}
