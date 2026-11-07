
import { mergePortfolioItems } from './utils';
import { PortfolioItem } from './excel-parser';

describe('mergePortfolioItems', () => {
    it('should merge items with the same valid ISIN', () => {
        const item1: PortfolioItem = {
            symbol: 'TCS', isin: 'INE467B01029', sector: 'IT', instrumentType: 'Equity',
            quantity: 10, averagePrice: 3000, currentValue: 32000, pnl: 2000
        };
        const item2: PortfolioItem = {
            symbol: 'TCS', isin: 'INE467B01029', sector: 'IT', instrumentType: 'Equity',
            quantity: 5, averagePrice: 3200, currentValue: 16000, pnl: 0
        };

        const result = mergePortfolioItems([item1, item2]);
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(15);
        // Avg: (30000 + 16000) / 15 = 3066.666...
        expect(result[0].averagePrice).toBeCloseTo(3066.67, 2);
    });

    it('should NOT merge items where one has ISIN and other is missing, even if Symbol matches (Strict Mode)', () => {
        const itemWithIsin: PortfolioItem = {
            symbol: 'INFY', isin: 'INE009A01021', sector: 'IT', instrumentType: 'Equity',
            quantity: 10, averagePrice: 1000, currentValue: 12000, pnl: 2000
        };
        const itemWithoutIsin: PortfolioItem = {
            symbol: 'INFY', isin: '', sector: 'IT', instrumentType: 'Equity',
            quantity: 5, averagePrice: 1200, currentValue: 6000, pnl: 0
        };

        const result = mergePortfolioItems([itemWithIsin, itemWithoutIsin]);
        // Expecting 2 items because we cannot trust Symbol alone to link them to the ISIN
        expect(result).toHaveLength(2);
    });

    it('should NOT merge items with different Symbols even if ISIN is invalid/N/A for both', () => {
        const item1: PortfolioItem = {
            symbol: 'ABC', isin: 'N/A', sector: 'X', instrumentType: 'Eq',
            quantity: 1, averagePrice: 100, currentValue: 100, pnl: 0
        };
        const item2: PortfolioItem = {
            symbol: 'XYZ', isin: 'N/A', sector: 'Y', instrumentType: 'Eq',
            quantity: 1, averagePrice: 100, currentValue: 100, pnl: 0
        };

        const result = mergePortfolioItems([item1, item2]);
        expect(result).toHaveLength(2);
    });

    it('should correctly merge AAVAS (Zerodha + Groww) and verify Avg Price, Value & P&L', () => {
        // Real-world Data
        const zerodhaItem: PortfolioItem = {
            symbol: 'AAVAS',
            isin: 'INE216P01012',
            sector: 'FINANCIAL SERVICES',
            instrumentType: 'Stocks',
            quantity: 4,
            averagePrice: 1644,
            // Corrected Value Calculation: Qty * Price
            // 4 * 1459.2 = 5836.8
            currentValue: 5836.8,
            pnl: -739.2
        };

        const growwItem: PortfolioItem = {
            symbol: 'AAVAS FINANCIERS LIMITED',
            isin: 'INE216P01012',
            sector: 'FINANCIAL SERVICES',
            instrumentType: 'Stocks',
            quantity: 7,
            averagePrice: 1314.5,
            currentValue: 10145.8,
            pnl: 944.3
        };

        const result = mergePortfolioItems([zerodhaItem, growwItem]);

        expect(result).toHaveLength(1);
        const merged = result[0];

        // 1. Quantity Check
        // 4 + 7 = 11
        expect(merged.quantity).toBe(11);

        // 2. Average Price Check
        // Total Invested = (4 * 1644) + (7 * 1314.5) = 6576 + 9201.5 = 15777.5
        // Avg = 15777.5 / 11 = 1434.31818...
        expect(merged.averagePrice).toBeCloseTo(1434.318, 2);

        // 3. Current Value Check
        // 5836.8 + 10145.8 = 15982.6
        expect(merged.currentValue).toBeCloseTo(15982.6, 1);

        // 4. P&L Check
        // -739.2 + 944.3 = 205.1
        expect(merged.pnl).toBeCloseTo(205.1, 1);

        expect(merged.isin).toBe('INE216P01012');
        expect(merged.symbol).toBe('AAVAS');
    });
});
