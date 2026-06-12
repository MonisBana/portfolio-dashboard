import { PortfolioItem } from "../excel-parser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class VestedClient {
    async authenticate(bearerToken: string, csrfToken?: string, cookie?: string): Promise<void> {
        const res = await fetch(`${API_BASE}/api/vested/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ bearerToken, csrfToken, cookie })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }
    }

    async getStatus(): Promise<{ isConnected: boolean; tokenExpiresAt?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/vested/status`, {
                credentials: 'include'
            });

            if (!res.ok) {
                return { isConnected: false };
            }

            return await res.json();
        } catch {
            return { isConnected: false };
        }
    }

    async syncHoldings(conversionRate?: number): Promise<PortfolioItem[]> {
        const params = new URLSearchParams();
        if (conversionRate) params.set('conversionRate', conversionRate.toString());

        const url = `${API_BASE}/api/vested/holdings${params.toString() ? '?' + params.toString() : ''}`;
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

    async disconnect(): Promise<void> {
        const res = await fetch(`${API_BASE}/api/vested/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!res.ok) {
            throw new Error('Failed to disconnect');
        }
    }
}

export const vestedClient = new VestedClient();
