import { PortfolioItem } from "../excel-parser";
import { API_BASE, apiFetch } from "./config";

export class ZerodhaClient {
    async getLoginUrl(): Promise<string> {
        const res = await apiFetch(`${API_BASE}/api/zerodha/login-url`, {
            credentials: 'include'
        });

        if (!res.ok) {
            throw new Error('Failed to get login URL');
        }

        const data = await res.json();
        return data.url;
    }

    async handleCallback(requestToken: string): Promise<void> {
        const res = await apiFetch(`${API_BASE}/api/zerodha/auth/callback`, {
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
        const res = await apiFetch(`${API_BASE}/api/zerodha/status`, {
            credentials: 'include'
        });

        if (!res.ok) {
            return { isConnected: false };
        }

        return await res.json();
    }

    async syncHoldings(): Promise<PortfolioItem[]> {
        const res = await apiFetch(`${API_BASE}/api/zerodha/holdings`, {
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
        const res = await apiFetch(`${API_BASE}/api/zerodha/disconnect`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!res.ok) {
            throw new Error('Failed to disconnect');
        }
    }
}

export const zerodhaClient = new ZerodhaClient();
