import { PortfolioItem } from "../excel-parser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ZerodhaClient {
    async getLoginUrl(): Promise<string> {
        const res = await fetch(`${API_BASE}/api/zerodha/login-url`, {
            credentials: 'include'
        });

        if (!res.ok) {
            throw new Error('Failed to get login URL');
        }

        const data = await res.json();
        return data.url;
    }

    async handleCallback(requestToken: string): Promise<void> {
        const res = await fetch(`${API_BASE}/api/zerodha/auth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ requestToken })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }
    }

    async getStatus(): Promise<{ isConnected: boolean }> {
        try {
            const res = await fetch(`${API_BASE}/api/zerodha/status`, {
                credentials: 'include'
            });

            if (!res.ok) {
                return { isConnected: false };
            }

            return await res.json();
        } catch (error) {
            return { isConnected: false };
        }
    }

    async syncHoldings(): Promise<PortfolioItem[]> {
        const res = await fetch(`${API_BASE}/api/zerodha/holdings`, {
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

    async disconnect(): Promise<void> {
        const res = await fetch(`${API_BASE}/api/zerodha/disconnect`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!res.ok) {
            throw new Error('Failed to disconnect');
        }
    }
}

export const zerodhaClient = new ZerodhaClient();
