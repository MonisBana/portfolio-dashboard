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
    private accounts: Map<string, VestedAccount> = new Map();

    constructor() {
        this.logger.log('VestedService initialized with multi-account support');
    }

    private getOrCreateAccount(accountName: string): VestedAccount {
        let account = this.accounts.get(accountName);
        if (!account) {
            account = { accessToken: null, csrfToken: null, cookie: null, tokenExpiry: null };
            this.accounts.set(accountName, account);
        }
        return account;
    }

    setToken(bearerToken: string, csrfToken?: string, cookie?: string, accountName: string = 'Self'): void {
        const account = this.getOrCreateAccount(accountName);
        // Strip non-ASCII characters that can creep in from clipboard/copy-paste
        const token = bearerToken.replace('Bearer ', '').trim().replace(/[^\x20-\x7E]/g, '');
        const sanitizedCsrf = csrfToken?.trim().replace(/[^\x20-\x7E]/g, '') || null;
        const sanitizedCookie = cookie?.trim().replace(/[^\x20-\x7E]/g, '') || null;

        try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            account.accessToken = token;
            account.csrfToken = sanitizedCsrf;
            account.cookie = sanitizedCookie;
            account.tokenExpiry = new Date(payload.exp * 1000);
            this.logger.log(`${accountName} token set. Expires at: ${account.tokenExpiry.toISOString()}`);
        } catch {
            account.accessToken = token;
            account.csrfToken = sanitizedCsrf;
            account.cookie = sanitizedCookie;
            account.tokenExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
            this.logger.warn(`${accountName}: Could not parse JWT expiry, assuming 4 hours`);
        }
    }

    isTokenValid(accountName: string = 'Self'): boolean {
        const account = this.accounts.get(accountName);
        if (!account?.accessToken || !account?.tokenExpiry) {
            return false;
        }
        return new Date() < account.tokenExpiry;
    }

    getAllAccountsStatus(): { accountName: string; isConnected: boolean; tokenExpiresAt?: string }[] {
        return Array.from(this.accounts.entries()).map(([name, account]) => ({
            accountName: name,
            isConnected: this.isTokenValid(name),
            tokenExpiresAt: this.isTokenValid(name) ? account.tokenExpiry?.toISOString() : undefined,
        }));
    }

    getStatus(): { isConnected: boolean; accounts: { accountName: string; isConnected: boolean; tokenExpiresAt?: string }[]; tokenExpiresAt?: string } {
        const accounts = this.getAllAccountsStatus();
        return {
            isConnected: accounts.some(a => a.isConnected),
            accounts,
            tokenExpiresAt: accounts.find(a => a.accountName === 'Self')?.tokenExpiresAt,
        };
    }

    disconnect(accountName?: string): void {
        if (accountName) {
            const account = this.accounts.get(accountName);
            if (account) {
                account.accessToken = null;
                account.csrfToken = null;
                account.cookie = null;
                account.tokenExpiry = null;
                this.logger.log(`${accountName} token cleared`);
            }
            return;
        }

        this.accounts.forEach((account, name) => {
            account.accessToken = null;
            account.csrfToken = null;
            account.cookie = null;
            account.tokenExpiry = null;
            this.logger.log(`${name} token cleared`);
        });
    }

    async fetchHoldings(conversionRate: number = 1, accountName: string = 'Self'): Promise<PortfolioItem[]> {
        if (!this.isTokenValid(accountName)) {
            throw new UnauthorizedException(`Token expired or not set for ${accountName}. Please provide a new Bearer token.`);
        }

        const account = this.accounts.get(accountName)!;

        try {
            this.logger.log(`Fetching portfolio from Vested for ${accountName}...`);

            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Authorization': `Bearer ${account.accessToken}`,
                'Origin': 'https://app.vestedfinance.com',
                'Referer': 'https://app.vestedfinance.com/',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
            };

            if (account.csrfToken) {
                headers['x-csrf-token'] = account.csrfToken;
            }

            if (account.cookie) {
                headers['Cookie'] = account.cookie;
            }

            const response = await fetch(
                `${this.API_BASE}/dashboard-v3?external=true&forceLatest=false&isFromDashboard=false`,
                {
                    method: 'GET',
                    headers,
                },
            );

            if (response.status === 401 || response.status === 403) {
                this.disconnect(accountName);
                throw new UnauthorizedException(`Token expired for ${accountName}. Please provide a new Bearer token.`);
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            }

            const data: VestedDashboardResponse = await response.json();

            if (!data.portfolioHoldings) {
                throw new Error('Invalid response structure from Vested API');
            }

            this.logger.log(`Fetched ${data.portfolioHoldings.length} holdings from Vested for ${accountName}`);

            const holdings = this.mapToPortfolio(data.portfolioHoldings, data.portfolioSectorBreakdown, conversionRate, accountName);

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
                    owner: accountName,
                });
                this.logger.log(`Added ${accountName} wallet balance: $${data.portfolioCash.cashBalance}`);
            }

            return holdings;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to fetch Vested holdings for ${accountName}: ${message}`);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new InternalServerErrorException(`Failed to fetch holdings from Vested for ${accountName}: ${message}`);
        }
    }

    async fetchAllHoldings(conversionRate: number = 1): Promise<PortfolioItem[]> {
        const allHoldings: PortfolioItem[] = [];

        for (const [accountName] of this.accounts) {
            if (this.isTokenValid(accountName)) {
                try {
                    const holdings = await this.fetchHoldings(conversionRate, accountName);
                    allHoldings.push(...holdings);
                } catch (error) {
                    this.logger.error(`Failed to fetch holdings for ${accountName}, skipping...`, error);
                }
            }
        }

        if (allHoldings.length === 0) {
            throw new UnauthorizedException('No accounts are connected. Please provide a Bearer token for at least one account.');
        }

        return allHoldings;
    }

    private mapToPortfolio(
        holdings: VestedHolding[],
        sectorBreakdown: Record<string, string>,
        conversionRate: number,
        accountName: string,
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
                    owner: accountName,
                };
            });
    }
}
