import { Injectable, UnauthorizedException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    PortfolioItem,
    IndMoneyAccount,
    IndMoneySummaryResponse,
    IndMoneyScripDetail,
} from './interfaces/indmoney.interface';

@Injectable()
export class IndMoneyService {
    private readonly logger = new Logger(IndMoneyService.name);
    private readonly API_BASE = 'https://apixt-us.indmoney.com';
    private accounts: Map<string, IndMoneyAccount> = new Map();

    constructor() {
        this.accounts.set('Self', { accessToken: null, tokenExpiry: null });
        this.accounts.set('Wife', { accessToken: null, tokenExpiry: null });
        this.logger.log('IndMoneyService initialized with multi-account support');
    }

    setToken(bearerToken: string, accountName: string): void {
        const account = this.accounts.get(accountName);
        if (!account) {
            throw new BadRequestException('Invalid account name');
        }

        const token = bearerToken.replace('Bearer ', '');

        try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            account.accessToken = token;
            account.tokenExpiry = new Date(payload.exp * 1000);
            this.logger.log(`${accountName} token set. Expires at: ${account.tokenExpiry.toISOString()}`);
        } catch {
            account.accessToken = token;
            account.tokenExpiry = new Date(Date.now() + 9 * 60 * 60 * 1000);
            this.logger.warn(`${accountName}: Could not parse JWT expiry, assuming 9 hours`);
        }
    }

    isTokenValid(accountName: string): boolean {
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

    getStatus(): { isConnected: boolean; accounts: { accountName: string; isConnected: boolean; tokenExpiresAt?: string }[] } {
        const accounts = this.getAllAccountsStatus();
        return {
            isConnected: accounts.some(a => a.isConnected),
            accounts,
        };
    }

    disconnect(accountName?: string): void {
        if (accountName) {
            const account = this.accounts.get(accountName);
            if (account) {
                account.accessToken = null;
                account.tokenExpiry = null;
                this.logger.log(`${accountName} token cleared`);
            }
        } else {
            this.accounts.forEach((account, name) => {
                account.accessToken = null;
                account.tokenExpiry = null;
            });
            this.logger.log('All tokens cleared');
        }
    }

    async fetchHoldings(accountName: string, conversionRate: number = 1): Promise<PortfolioItem[]> {
        if (!this.isTokenValid(accountName)) {
            throw new UnauthorizedException(`Token expired or not set for ${accountName}. Please provide a new Bearer token.`);
        }

        const account = this.accounts.get(accountName)!;

        try {
            this.logger.log(`Fetching US stock holdings from INDMoney for ${accountName}...`);

            const requestId = randomUUID();
            const sessionId = randomUUID();

            const response = await fetch(
                `${this.API_BASE}/us-stock-broker/us/portfolio/equity/summary?response_format=json`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${account.accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': '*/*',
                        'platform': 'web',
                        'Origin': 'https://www.indmoney.com',
                        'Referer': 'https://www.indmoney.com/',
                        'X-Amzn-Trace-Id': `request_id=${requestId};session_id=${sessionId};requested_by=web;t=${Date.now()}`,
                    },
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

            const data: IndMoneySummaryResponse = await response.json();

            if (!data.success || !data.demat_summary?.asset_summary?.scrip_details) {
                throw new Error('Invalid response structure from INDMoney API');
            }

            const scripDetails = data.demat_summary.asset_summary.scrip_details;
            this.logger.log(`Fetched ${scripDetails.length} holdings from INDMoney for ${accountName}`);

            const holdings = this.mapToPortfolio(scripDetails, conversionRate, accountName);

            if (data.user_wallet_balance?.success && data.user_wallet_balance.total_balance > 0) {
                const walletBalance = data.user_wallet_balance.total_balance;
                holdings.push({
                    symbol: 'INDMoney Wallet',
                    isin: 'US:INDMONEY_WALLET',
                    sector: 'Cash',
                    instrumentType: 'Cash',
                    quantity: 1,
                    averagePrice: walletBalance * conversionRate,
                    currentValue: walletBalance * conversionRate,
                    pnl: 0,
                    source: 'IndMoney',
                    owner: accountName,
                });
                this.logger.log(`Added ${accountName} wallet balance: $${walletBalance}`);
            }

            return holdings;
        } catch (error) {
            this.logger.error(`Failed to fetch INDMoney holdings for ${accountName}:`, error.message);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new InternalServerErrorException(`Failed to fetch holdings from INDMoney for ${accountName}: ${error.message}`);
        }
    }

    async fetchAllHoldings(conversionRate: number = 1): Promise<PortfolioItem[]> {
        const allHoldings: PortfolioItem[] = [];

        for (const [accountName] of this.accounts) {
            if (this.isTokenValid(accountName)) {
                try {
                    const holdings = await this.fetchHoldings(accountName, conversionRate);
                    allHoldings.push(...holdings);
                } catch (error) {
                    this.logger.error(`Failed to fetch holdings for ${accountName}, skipping...`, error);
                }
            }
        }

        if (allHoldings.length === 0) {
            throw new BadRequestException('No accounts are connected. Please provide a Bearer token for at least one account.');
        }

        return allHoldings;
    }

    private mapToPortfolio(scripDetails: IndMoneyScripDetail[], conversionRate: number, owner: string): PortfolioItem[] {
        return scripDetails
            .filter(scrip => {
                const qty = scrip.holdings?.quantity || scrip.aggregated?.quantity || 0;
                return qty > 0;
            })
            .map(scrip => {
                const holdings = scrip.holdings;
                const metadata = scrip.metadata;

                const quantity = holdings.quantity;
                const averagePrice = holdings.avg_price;
                const currentValue = holdings.current_value;
                const pnl = holdings.overall_pnl;

                const instrumentType = metadata.entity_type === 'ETF' ? 'US ETF' : 'US Equity';
                const sector = metadata.sector === 'ETF' ? 'ETF' : metadata.sector;

                return {
                    symbol: metadata.symbol || metadata.name,
                    isin: `US:${metadata.symbol}`,
                    sector: sector,
                    instrumentType: instrumentType,
                    quantity: quantity,
                    averagePrice: averagePrice * conversionRate,
                    currentValue: currentValue * conversionRate,
                    pnl: pnl * conversionRate,
                    source: 'IndMoney',
                    owner: owner,
                };
            });
    }
}
