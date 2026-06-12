import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import {
    PortfolioItem,
    VestedAccount,
    VestedDashboardResponse,
    VestedHolding,
} from './interfaces/vested.interface';

@Injectable()
export class VestedService {
    private readonly logger = new Logger(VestedService.name);
    private readonly API_BASE = 'https://vested-api-prod-ga.vestedfinance.com';
    private account: VestedAccount = { accessToken: null, csrfToken: null, cookie: null, tokenExpiry: null };

    constructor() {
        this.logger.log('VestedService initialized');
    }

    setToken(bearerToken: string, csrfToken?: string, cookie?: string): void {
        // Strip non-ASCII characters that can creep in from clipboard/copy-paste
        const token = bearerToken.replace('Bearer ', '').trim().replace(/[^\x20-\x7E]/g, '');
        const sanitizedCsrf = csrfToken?.trim().replace(/[^\x20-\x7E]/g, '') || null;
        const sanitizedCookie = cookie?.trim().replace(/[^\x20-\x7E]/g, '') || null;

        try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            this.account.accessToken = token;
            this.account.csrfToken = sanitizedCsrf;
            this.account.cookie = sanitizedCookie;
            this.account.tokenExpiry = new Date(payload.exp * 1000);
            this.logger.log(`Token set. Expires at: ${this.account.tokenExpiry.toISOString()}`);
        } catch {
            this.account.accessToken = token;
            this.account.csrfToken = sanitizedCsrf;
            this.account.cookie = sanitizedCookie;
            this.account.tokenExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
            this.logger.warn('Could not parse JWT expiry, assuming 4 hours');
        }
    }

    isTokenValid(): boolean {
        if (!this.account.accessToken || !this.account.tokenExpiry) {
            return false;
        }
        return new Date() < this.account.tokenExpiry;
    }

    getStatus(): { isConnected: boolean; tokenExpiresAt?: string } {
        return {
            isConnected: this.isTokenValid(),
            tokenExpiresAt: this.isTokenValid() ? this.account.tokenExpiry?.toISOString() : undefined,
        };
    }

    disconnect(): void {
        this.account.accessToken = null;
        this.account.csrfToken = null;
        this.account.cookie = null;
        this.account.tokenExpiry = null;
        this.logger.log('Token cleared');
    }

    async fetchHoldings(conversionRate: number = 1): Promise<PortfolioItem[]> {
        if (!this.isTokenValid()) {
            throw new UnauthorizedException('Token expired or not set. Please provide a new Bearer token.');
        }

        try {
            this.logger.log('Fetching portfolio from Vested...');

            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Authorization': `Bearer ${this.account.accessToken}`,
                'Origin': 'https://app.vestedfinance.com',
                'Referer': 'https://app.vestedfinance.com/',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
            };

            if (this.account.csrfToken) {
                headers['x-csrf-token'] = this.account.csrfToken;
            }

            if (this.account.cookie) {
                headers['Cookie'] = this.account.cookie;
            }

            const response = await fetch(
                `${this.API_BASE}/dashboard-v3?external=true&forceLatest=false&isFromDashboard=false`,
                {
                    method: 'GET',
                    headers,
                },
            );

            if (response.status === 401 || response.status === 403) {
                this.disconnect();
                throw new UnauthorizedException('Token expired. Please provide a new Bearer token.');
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            }

            const data: VestedDashboardResponse = await response.json();

            if (!data.portfolioHoldings) {
                throw new Error('Invalid response structure from Vested API');
            }

            this.logger.log(`Fetched ${data.portfolioHoldings.length} holdings from Vested`);

            const holdings = this.mapToPortfolio(data.portfolioHoldings, data.portfolioSectorBreakdown, conversionRate);

            if (data.portfolioCash?.cashBalance > 0) {
                holdings.push({
                    symbol: 'Vested Wallet',
                    isin: 'US:VESTED_WALLET',
                    sector: 'Cash',
                    instrumentType: 'Cash',
                    quantity: 1,
                    averagePrice: data.portfolioCash.cashBalance * conversionRate,
                    currentValue: data.portfolioCash.cashBalance * conversionRate,
                    pnl: 0,
                    source: 'Vested',
                    owner: 'Self',
                });
                this.logger.log(`Added wallet balance: $${data.portfolioCash.cashBalance}`);
            }

            return holdings;
        } catch (error: any) {
            this.logger.error('Failed to fetch Vested holdings:', error.message);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new InternalServerErrorException(`Failed to fetch holdings from Vested: ${error.message}`);
        }
    }

    private mapToPortfolio(
        holdings: VestedHolding[],
        sectorBreakdown: Record<string, string>,
        conversionRate: number,
    ): PortfolioItem[] {
        return holdings
            .filter(h => h.qtyAvailable > 0)
            .map(holding => {
                const isEtf = holding.type.toUpperCase() === 'ETF';
                const instrumentType = isEtf ? 'US ETF' : 'US Equity';
                const sector = isEtf ? 'ETF' : (holding.type || 'Equity');
                const pnl = holding.overallProfit ? holding.overallPrice : -holding.overallPrice;

                return {
                    symbol: holding.symbol,
                    isin: `US:${holding.symbol}`,
                    sector,
                    instrumentType,
                    quantity: holding.qtyAvailable,
                    averagePrice: holding.averageCost * conversionRate,
                    currentValue: holding.marketValue * conversionRate,
                    pnl: pnl * conversionRate,
                    source: 'Vested',
                    owner: 'Self',
                };
            });
    }
}
