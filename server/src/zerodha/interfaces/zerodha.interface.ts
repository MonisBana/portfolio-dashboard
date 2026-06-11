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

export interface ZerodhaHolding {
    tradingsymbol: string;
    exchange: string;
    isin: string;
    quantity: number;
    authorised_date: string;
    average_price: number;
    last_price: number;
    close_price: number;
    pnl: number;
    day_change: number;
    day_change_percentage: number;
    instrument_type: string;
    product: string;
}

export interface ZerodhaSession {
    user_type: string;
    email: string;
    user_name: string;
    user_shortname: string;
    broker: string;
    exchanges: string[];
    products: string[];
    order_types: string[];
    avatar_url: string | null;
    user_id: string;
    api_key: string;
    access_token: string;
    public_token: string;
    refresh_token: string;
    silo: string;
    login_time: string;
}
