import { PortfolioItem } from "../excel-parser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface IndMoneyAccountStatus {
    accountName: string;
    isConnected: boolean;
    tokenExpiresAt?: string;
}

export class IndMoneyClient {
    async authenticate(bearerToken: string, accountName: 'Self' | 'Wife'): Promise<void> {
        const res = await fetch(`${API_BASE}/api/indmoney/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ bearerToken, accountName })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }
    }

    async getStatus(): Promise<{ isConnected: boolean; accounts: IndMoneyAccountStatus[] }> {
        try {
            const res = await fetch(`${API_BASE}/api/indmoney/status`, {
                credentials: 'include'
            });

            if (!res.ok) {
                return { isConnected: false, accounts: [] };
            }

            return await res.json();
        } catch {
            return { isConnected: false, accounts: [] };
        }
    }

    async syncHoldings(accountName?: 'Self' | 'Wife', conversionRate?: number): Promise<PortfolioItem[]> {
        const params = new URLSearchParams();
        if (accountName) params.set('accountName', accountName);
        if (conversionRate) params.set('conversionRate', conversionRate.toString());

        const url = `${API_BASE}/api/indmoney/holdings${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url, {
            credentials: 'include'
        });

        if (res.status === 401) {
            throw new Error('TOKEN_EXPIRED');
        }

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Failed to fetch holdings' }));
            throw new Error(error.message || 'Failed to fetch holdings');
        }

        return await res.json();
    }

    async disconnect(accountName?: 'Self' | 'Wife'): Promise<void> {
        const res = await fetch(`${API_BASE}/api/indmoney/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(accountName ? { accountName } : {})
        });

        if (!res.ok) {
            throw new Error('Failed to disconnect');
        }
    }
}

export const indMoneyClient = new IndMoneyClient();
