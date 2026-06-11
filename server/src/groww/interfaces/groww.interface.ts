export interface PortfolioItem {
    symbol: string;
    isin: string;
    sector: string;
    instrumentType: string;
    quantity: number;
    averagePrice: number;
    currentValue: number;
    pnl: number;
    source?: string;
    owner?: string;
}

export interface GrowwAccount {
    accountId: string;
    accountName: string; // 'Self' or 'Wife'
    accessToken: string | null;
    tokenExpiry: Date | null;
}

export interface GrowwAuthCredentials {
    apiKey: string;
    apiSecret: string;
    accountName: string; // 'Self' or 'Wife'
}

export interface GrowwHolding {
    isin: string;
    trading_symbol: string;
    quantity: number;
    average_price: number;
    pledge_quantity?: number;
    demat_locked_quantity?: number;
    groww_locked_quantity?: number;
    repledge_quantity?: number;
    t1_quantity?: number;
    demat_free_quantity?: number;
    corporate_action_additional_quantity?: number;
    active_demat_transfer_quantity?: number;
}

export interface GrowwTokenResponse {
    status: string;
    payload: {
        access_token: string;
        expires_in?: number;
    };
}

export interface GrowwHoldingsResponse {
    status: string;
    payload: {
        holdings: GrowwHolding[];
    };
}
