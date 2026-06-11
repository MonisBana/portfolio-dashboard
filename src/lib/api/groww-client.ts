import { PortfolioItem } from "../excel-parser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GrowwAccountStatus {
    accountName: string;
    isConnected: boolean;
}

export interface GrowwAuthPayload {
    apiKey: string;
    apiSecret?: string;
    totp?: string;
    accountName: 'Self' | 'Wife';
}

export class GrowwClient {
    async authenticateWithApiKey(apiKey: string, apiSecret: string, accountName: 'Self' | 'Wife'): Promise<void> {
        const res = await fetch(`${API_BASE}/api/groww/auth/api-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ apiKey, apiSecret, accountName })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }
    }

    async authenticateWithTOTP(apiKey: string, totp: string, accountName: 'Self' | 'Wife'): Promise<void> {
        const res = await fetch(`${API_BASE}/api/groww/auth/totp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ apiKey, totp, accountName })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }
    }

    async getStatus(): Promise<{ isConnected: boolean; accounts: GrowwAccountStatus[] }> {
        try {
            const res = await fetch(`${API_BASE}/api/groww/status`, {
                credentials: 'include'
            });

            if (!res.ok) {
                return { isConnected: false, accounts: [] };
            }

            return await res.json();
        } catch (error) {
            return { isConnected: false, accounts: [] };
        }
    }

    async syncHoldings(accountName?: 'Self' | 'Wife'): Promise<PortfolioItem[]> {
        const url = accountName
            ? `${API_BASE}/api/groww/holdings?accountName=${accountName}`
            : `${API_BASE}/api/groww/holdings`;

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
        const res = await fetch(`${API_BASE}/api/groww/disconnect`, {
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

export const growwClient = new GrowwClient();
