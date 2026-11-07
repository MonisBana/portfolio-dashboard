import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { KiteConnect } from 'kiteconnect';
import type { Connect, PortfolioHolding } from 'kiteconnect';
import { PortfolioItem } from './interfaces/zerodha.interface';

interface ZerodhaAccount {
    accountName: string;
    accessToken: string | null;
    tokenExpiry: Date | null;
    kiteConnect: Connect;
}

@Injectable()
export class ZerodhaService {
    private readonly logger = new Logger(ZerodhaService.name);
    private readonly apiKey: string;
    private accounts: Map<string, ZerodhaAccount> = new Map();
    private pendingAccountName: string = 'Self';

    constructor() {
        const apiKey = process.env.ZERODHA_API_KEY;

        if (!apiKey) {
            throw new Error('ZERODHA_API_KEY is not set in environment variables');
        }

        this.apiKey = apiKey;
        this.logger.log('ZerodhaService initialized with multi-account support');
    }

    private getOrCreateAccount(accountName: string): ZerodhaAccount {
        let account = this.accounts.get(accountName);
        if (!account) {
            account = {
                accountName,
                accessToken: null,
                tokenExpiry: null,
                kiteConnect: new KiteConnect({ api_key: this.apiKey }),
            };
            this.accounts.set(accountName, account);
        }
        return account;
    }

    getLoginUrl(accountName: string = 'Self'): string {
        try {
            this.pendingAccountName = accountName;
            const loginUrl = this.getOrCreateAccount(accountName).kiteConnect.getLoginURL();
            this.logger.log(`Generated login URL for ${accountName}`);
            return loginUrl;
        } catch (error) {
            this.logger.error('Failed to generate login URL', error);
            throw new InternalServerErrorException('Failed to generate login URL');
        }
    }

    async generateAccessToken(requestToken: string, accountName?: string): Promise<void> {
        const name = accountName || this.pendingAccountName || 'Self';
        try {
            const apiSecret = process.env.ZERODHA_API_SECRET;
            if (!apiSecret) {
                throw new Error('ZERODHA_API_SECRET is not set in environment variables');
            }

            const account = this.getOrCreateAccount(name);
            this.logger.log(`Generating access token for ${name}...`);
            const session = await account.kiteConnect.generateSession(
                requestToken,
                apiSecret
            );

            account.accessToken = session.access_token;
            account.kiteConnect.setAccessToken(account.accessToken);

            // Token expires at end of trading day (11:59 PM)
            account.tokenExpiry = new Date();
            account.tokenExpiry.setHours(23, 59, 59, 999);

            this.logger.log(`${name} access token generated successfully. Expires at: ${account.tokenExpiry.toISOString()}`);
        } catch (error) {
            this.logger.error(`Failed to generate access token for ${name}`, error);
            throw new UnauthorizedException('Failed to authenticate with Zerodha');
        }
    }

    isTokenValid(accountName?: string): boolean {
        if (accountName) {
            const account = this.accounts.get(accountName);
            return this.isAccountTokenValid(account);
        }
        return Array.from(this.accounts.values()).some(account => this.isAccountTokenValid(account));
    }

    private isAccountTokenValid(account?: ZerodhaAccount): boolean {
        const valid = !!account?.accessToken &&
            !!account?.tokenExpiry &&
            new Date() < account.tokenExpiry;

        if (!valid && account?.accessToken) {
            this.logger.warn(`${account.accountName} token has expired`);
        }

        return valid;
    }

    getAllAccountsStatus(): { accountName: string; isConnected: boolean }[] {
        return Array.from(this.accounts.values()).map(account => ({
            accountName: account.accountName,
            isConnected: this.isAccountTokenValid(account),
        }));
    }

    clearToken(accountName?: string): void {
        if (accountName) {
            const account = this.accounts.get(accountName);
            if (account) {
                account.accessToken = null;
                account.tokenExpiry = null;
                account.kiteConnect.setAccessToken('');
                this.logger.log(`${accountName} token cleared`);
            }
            return;
        }

        this.accounts.forEach(account => {
            account.accessToken = null;
            account.tokenExpiry = null;
            account.kiteConnect.setAccessToken('');
        });
        this.logger.log('All tokens cleared');
    }

    async fetchHoldings(accountName: string = 'Self'): Promise<PortfolioItem[]> {
        if (!this.isTokenValid(accountName)) {
            this.logger.warn(`Attempted to fetch ${accountName} holdings with invalid token`);
            throw new UnauthorizedException(`Token expired or not set for ${accountName}`);
        }

        const account = this.accounts.get(accountName);
        if (!account) {
            throw new UnauthorizedException(`No valid token for ${accountName}`);
        }

        try {
            this.logger.log(`Fetching holdings from Zerodha for ${accountName}...`);
            const holdings = await account.kiteConnect.getHoldings();

            this.logger.log(`Fetched ${holdings.length} holdings from Zerodha for ${accountName}`);
            return this.mapZerodhaToPortfolio(holdings, accountName);
        } catch (error) {
            this.logger.error(`Failed to fetch holdings for ${accountName}`, error);

            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('403') || message.includes('401')) {
                this.clearToken(accountName);
                throw new UnauthorizedException(`Session expired for ${accountName}. Please reconnect to Zerodha.`);
            }

            throw new InternalServerErrorException(`Failed to fetch holdings from Zerodha for ${accountName}`);
        }
    }

    async fetchAllHoldings(): Promise<PortfolioItem[]> {
        const allHoldings: PortfolioItem[] = [];

        for (const [accountName] of this.accounts) {
            if (this.isTokenValid(accountName)) {
                try {
                    const holdings = await this.fetchHoldings(accountName);
                    allHoldings.push(...holdings);
                } catch (error) {
                    this.logger.error(`Failed to fetch holdings for ${accountName}, skipping...`, error);
                }
            }
        }

        if (allHoldings.length === 0) {
            throw new UnauthorizedException('No accounts are connected. Please connect at least one Zerodha account.');
        }

        return allHoldings;
    }

    private mapZerodhaToPortfolio(holdings: PortfolioHolding[], accountName: string): PortfolioItem[] {
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
                owner: accountName
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
