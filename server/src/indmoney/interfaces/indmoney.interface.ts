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

export interface IndMoneyAccount {
    accessToken: string | null;
    tokenExpiry: Date | null;
}

export interface IndMoneyScripMetadata {
    name: string;
    symbol: string;
    sector: string;
    entity_type: string; // "STOCK" | "ETF"
    live_price: number;
    day_change: number;
    day_change_percentage: number;
}

export interface IndMoneyHoldings {
    quantity: number;
    current_value: number;
    avg_price: number;
    invested_amount: number;
    overall_pnl: number;
    overall_pnl_percentage: number;
    day_pnl: number;
    day_pnl_percentage: number;
    exclude_from_holdings_summary?: boolean;
}

export interface IndMoneyScripDetail {
    metadata: IndMoneyScripMetadata;
    holdings: IndMoneyHoldings;
    aggregated: IndMoneyHoldings;
}

export interface IndMoneyWalletBalance {
    success: boolean;
    total_balance: number;
    available_balance: number;
    withdrawal_balance: number;
    intra_day_balance: number;
}

export interface IndMoneySummaryResponse {
    success: boolean;
    demat_summary: {
        success: boolean;
        summary: {
            current_value: number;
            invested_value: number;
            pnl: number;
            percentage_return: number;
            holding_count: number;
        };
        asset_summary: {
            holdings_summary: {
                current_value: number;
                invested_value: number;
                pnl: number;
                holding_count: number;
            };
            scrip_details: IndMoneyScripDetail[];
        };
    };
    user_wallet_balance?: IndMoneyWalletBalance;
}
