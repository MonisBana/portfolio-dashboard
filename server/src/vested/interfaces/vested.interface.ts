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

export interface VestedAccount {
    accessToken: string | null;
    csrfToken: string | null;
    cookie: string | null;
    tokenExpiry: Date | null;
}

export interface VestedHolding {
    symbol: string;
    price: number;
    previousClose: number;
    marketValue: number;
    isOtc: boolean;
    profit: boolean;
    changePercent: number;
    change: number;
    qtyAvailableForTrade: number;
    qtyAvailable: number;
    costBasis: number;
    averageCost: number;
    portfolioPercent: number;
    todayReturnProfit: boolean;
    todayReturnPrice: number;
    todayReturnPercent: number;
    overallProfit: boolean;
    overallPrice: number;
    overallPercent: number;
    name: string;
    type: string;
    volatility?: number;
}

export interface VestedDashboardResponse {
    portfolioPerformance: {
        accountValue: number;
        currentValue: number;
        investedAmount: number;
        unrealizedPL: number;
        unrealizedPLPercent: number;
        portfolioInProfit: boolean;
        oneDayReturn: {
            profit: boolean;
            amount: number;
            percent: number;
        };
    };
    portfolioCash: {
        cashBalance: number;
        cashAvailableForTrade: number;
        cashAvailableForWithdrawal: number;
        unSettledCash: number;
    };
    portfolioHoldings: VestedHolding[];
    portfolioSectorBreakdown: Record<string, string>;
    portfolioInstruments: string[];
}
