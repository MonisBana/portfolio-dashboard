import { PortfolioItem } from "../excel-parser";
import { API_BASE, apiFetch } from "./config";

export class VestedClient {
    async authenticate(bearerToken: string, csrfToken?: string, cookie?: string): Promise<void> {
        const res = await apiFetch(`${API_BASE}/api/vested/auth`, {
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
        const res = await apiFetch(`${API_BASE}/api/vested/status`, {
            credentials: 'include'
        });

        if (!res.ok) {
            return { isConnected: false };
        }

        return await res.json();
    }

    async syncHoldings(conversionRate?: number): Promise<PortfolioItem[]> {
        const params = new URLSearchParams();
        if (conversionRate) params.set('conversionRate', conversionRate.toString());

        const url = `${API_BASE}/api/vested/holdings${params.toString() ? '?' + params.toString() : ''}`;
        const res = await apiFetch(url, {
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
        const res = await apiFetch(`${API_BASE}/api/vested/disconnect`, {
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
