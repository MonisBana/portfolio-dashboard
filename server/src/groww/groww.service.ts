import { Injectable, UnauthorizedException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import YahooFinance from 'yahoo-finance2';
import { PortfolioItem, GrowwAccount, GrowwHolding } from './interfaces/groww.interface';

@Injectable()
export class GrowwService {
    private readonly logger = new Logger(GrowwService.name);
    private readonly API_BASE = 'https://api.groww.in/v1';
    private readonly yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    private accounts: Map<string, GrowwAccount> = new Map();

    constructor() {
        this.logger.log('GrowwService initialized with multi-account support');
    }

    private getOrCreateAccount(accountName: string): GrowwAccount {
        let account = this.accounts.get(accountName);
        if (!account) {
            account = {
                accountId: accountName.toLowerCase(),
                accountName,
                accessToken: null,
                tokenExpiry: null,
            };
            this.accounts.set(accountName, account);
        }
        return account;
    }

    private generateChecksum(apiSecret: string, timestamp: number): string {
        const data = apiSecret + timestamp.toString();
        return createHash('sha256').update(data).digest('hex');
    }

    async authenticateWithApiKey(apiKey: string, apiSecret: string, accountName: string): Promise<void> {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const checksum = this.generateChecksum(apiSecret, timestamp);

            this.logger.log(`Authenticating ${accountName} account with API Key...`);

            const response = await fetch(`${this.API_BASE}/token/api/access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-VERSION': '1.0',
                },
                body: JSON.stringify({
                    key_type: 'approval',
                    checksum: checksum,
                    timestamp: timestamp.toString(),
                }),
            });

            const responseText = await response.text();
            this.logger.log(`Groww authentication response status: ${response.status}`);

            if (!response.ok) {
                let errorMessage = 'Authentication failed';
                try {
                    const error = JSON.parse(responseText);
                    errorMessage = error.message || error.error?.message || 'Authentication failed';
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);

            // Try both possible field names for the token
            const token = data.token || data.payload?.access_token || data.access_token;

            if (!token) {
                this.logger.error(`No token in Groww authentication response for ${accountName}`);
                throw new Error('Invalid response from Groww API - no token found');
            }

            const account = this.getOrCreateAccount(accountName);

            account.accessToken = token;
            // Token expires at 6:00 AM next day
            account.tokenExpiry = this.getNextDayExpiry();

            this.logger.log(`${accountName} account authenticated successfully. Expires at: ${account.tokenExpiry.toISOString()}`);
        } catch (error) {
            this.logger.error(`Failed to authenticate ${accountName} account:`, error.stack || error);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException(`Failed to authenticate ${accountName} account with Groww: ${error.message}`);
        }
    }

    async authenticateWithTOTP(apiKey: string, totp: string, accountName: string): Promise<void> {
        try {
            this.logger.log(`Authenticating ${accountName} account with TOTP...`);

            const response = await fetch(`${this.API_BASE}/token/api/access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-VERSION': '1.0',
                },
                body: JSON.stringify({
                    key_type: 'totp',
                    totp: totp,
                }),
            });

            const responseText = await response.text();
            this.logger.log(`Groww TOTP authentication response status: ${response.status}`);

            if (!response.ok) {
                let errorMessage = 'Authentication failed';
                try {
                    const error = JSON.parse(responseText);
                    errorMessage = error.message || error.error?.message || 'Authentication failed with TOTP';
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);

            // Try both possible field names for the token
            const token = data.token || data.payload?.access_token || data.access_token;

            if (!token) {
                this.logger.error(`No token in Groww TOTP response for ${accountName}`);
                throw new Error('Invalid response from Groww API - no token found');
            }

            const account = this.getOrCreateAccount(accountName);

            account.accessToken = token;
            account.tokenExpiry = this.getNextDayExpiry();

            this.logger.log(`${accountName} account authenticated successfully with TOTP. Expires at: ${account.tokenExpiry.toISOString()}`);
        } catch (error) {
            this.logger.error(`Failed to authenticate ${accountName} account with TOTP:`, error.stack || error);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException(`Failed to authenticate ${accountName} account with Groww: ${error.message}`);
        }
    }

    private getNextDayExpiry(): Date {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0); // 6:00 AM next day
        return tomorrow;
    }

    isTokenValid(accountName: string): boolean {
        const account = this.accounts.get(accountName);
        if (!account) {
            return false;
        }

        const valid = account.accessToken !== null &&
            account.tokenExpiry !== null &&
            new Date() < account.tokenExpiry;

        if (!valid && account.accessToken) {
            this.logger.warn(`${accountName} token has expired`);
        }

        return valid;
    }

    getAllAccountsStatus(): { accountName: string; isConnected: boolean }[] {
        return Array.from(this.accounts.values()).map(account => ({
            accountName: account.accountName,
            isConnected: this.isTokenValid(account.accountName),
        }));
    }

    clearToken(accountName: string): void {
        const account = this.accounts.get(accountName);
        if (account) {
            account.accessToken = null;
            account.tokenExpiry = null;
            this.logger.log(`${accountName} token cleared`);
        }
    }

    clearAllTokens(): void {
        this.accounts.forEach((_, accountName) => {
            this.clearToken(accountName);
        });
        this.logger.log('All tokens cleared');
    }

    async fetchHoldings(accountName: string): Promise<PortfolioItem[]> {
        if (!this.isTokenValid(accountName)) {
            this.logger.warn(`Attempted to fetch holdings for ${accountName} with invalid token`);
            throw new UnauthorizedException(`Token expired or not set for ${accountName} account`);
        }

        const account = this.accounts.get(accountName);
        if (!account || !account.accessToken) {
            throw new UnauthorizedException(`No valid token for ${accountName} account`);
        }

        try {
            this.logger.log(`Fetching holdings for ${accountName} account from Groww...`);
            this.logger.log(`Using endpoint: ${this.API_BASE}/holdings/user`);

            const response = await fetch(`${this.API_BASE}/holdings/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`,
                    'Accept': 'application/json',
                    'X-API-VERSION': '1.0',
                },
            });

            const responseText = await response.text();
            this.logger.log(`Groww holdings response status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.clearToken(accountName);
                    throw new UnauthorizedException(`Session expired for ${accountName}. Please reconnect.`);
                }
                throw new Error(`Groww holdings request failed with HTTP ${response.status}`);
            }

            const data = JSON.parse(responseText);

            if (data.status !== 'SUCCESS' || !data.payload?.holdings) {
                this.logger.error(`Unexpected Groww holdings response structure for ${accountName}`);
                throw new Error('Invalid response from Groww API');
            }

            const holdings = data.payload.holdings;
            this.logger.log(`Fetched ${holdings.length} holdings for ${accountName} from Groww`);

            // Fetch current prices (LTP) for all holdings
            const holdingsWithPrices = await this.enrichWithCurrentPrices(holdings);

            return this.mapGrowwToPortfolio(holdingsWithPrices, accountName);
        } catch (error) {
            this.logger.error(`Failed to fetch holdings for ${accountName}:`, error.message);
            this.logger.error('Full error:', error.stack || error);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new InternalServerErrorException(`Failed to fetch holdings for ${accountName} from Groww: ${error.message}`);
        }
    }

    async fetchAllHoldings(): Promise<PortfolioItem[]> {
        const allHoldings: PortfolioItem[] = [];

        for (const accountName of this.accounts.keys()) {
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
            throw new BadRequestException('No accounts are connected. Please authenticate at least one account.');
        }

        return allHoldings;
    }

    private async enrichWithCurrentPrices(holdings: GrowwHolding[]): Promise<Array<GrowwHolding & { currentPrice?: number }>> {
        if (holdings.length === 0) {
            return holdings;
        }

        try {
            const symbols = holdings.map(h => `${h.trading_symbol}.NS`);
            this.logger.log(`Fetching current prices for ${symbols.length} symbols via Yahoo Finance...`);

            const quotes = await this.yahooFinance.quote(symbols);

            const priceMap: Record<string, number> = {};
            for (const q of quotes) {
                if (q.symbol && q.regularMarketPrice) {
                    // Map back using the base symbol (strip .NS suffix)
                    const baseSymbol = q.symbol.replace('.NS', '');
                    priceMap[baseSymbol] = q.regularMarketPrice;
                }
            }

            // Find symbols that failed on NSE and try BSE
            const missingSymbols = holdings
                .filter(h => !priceMap[h.trading_symbol])
                .map(h => `${h.trading_symbol}.BO`);

            if (missingSymbols.length > 0) {
                this.logger.log(`Retrying ${missingSymbols.length} symbols on BSE...`);
                const bseQuotes = await this.yahooFinance.quote(missingSymbols);
                for (const q of bseQuotes) {
                    if (q.symbol && q.regularMarketPrice) {
                        const baseSymbol = q.symbol.replace('.BO', '');
                        priceMap[baseSymbol] = q.regularMarketPrice;
                    }
                }
            }

            this.logger.log(`Got prices for ${Object.keys(priceMap).length}/${holdings.length} symbols`);

            return holdings.map(h => ({
                ...h,
                currentPrice: priceMap[h.trading_symbol] || 0,
            }));
        } catch (error) {
            this.logger.error('Failed to fetch current prices from Yahoo Finance:', error instanceof Error ? error.message : String(error));
            return holdings.map(h => ({ ...h, currentPrice: 0 }));
        }
    }

    private mapGrowwToPortfolio(holdings: Array<GrowwHolding & { currentPrice?: number }>, accountName: string): PortfolioItem[] {
        return holdings.map(h => {
            const quantity = h.quantity || 0;
            const averagePrice = h.average_price || 0;
            const currentPrice = h.currentPrice || 0;
            const currentValue = quantity * currentPrice;
            const investedValue = quantity * averagePrice;
            const pnl = currentValue - investedValue;

            return {
                symbol: h.trading_symbol || 'UNKNOWN',
                isin: h.isin || '',
                sector: 'Equity', // Groww holdings are primarily equity
                instrumentType: 'Stocks',
                quantity: quantity,
                averagePrice: averagePrice,
                currentValue: currentValue,
                pnl: pnl,
                source: 'Groww',
                owner: accountName,
            };
        });
    }
}
