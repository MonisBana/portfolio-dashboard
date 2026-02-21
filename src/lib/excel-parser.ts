import * as XLSX from "xlsx";
import { getSectorForISIN } from "./stock-sector-map";

export interface PortfolioItem {
    symbol: string;
    isin: string;
    sector: string;
    instrumentType: string;
    quantity: number;
    averagePrice: number;
    currentValue: number;
    pnl: number;
    source?: string; // e.g. "Zerodha", "Groww"
    owner?: string; // e.g. "Self", "Spouse"
}


// Helper to clean up instrument type for Asset Allocation (Zerodha specific)
const cleanInstrumentType = (rawType: string, sector: string): string => {
    if (!rawType) return "";
    // Remove curly braces if present
    const type = rawType.replace(/[{}]/g, "").replace("true", "").trim();
    // Map "-" to "Stocks"
    if (type !== "-") return type;
    else if (sector === "ETF") return "ETF";
    else return "Stocks";
};

export const parseZerodhaExcel = async (file: File): Promise<PortfolioItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = "Combined";
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    reject(new Error(`Sheet "${sheetName}" not found. Please ensure this is a valid Zerodha portfolio file.`));
                    return;
                }

                // The user specified range B23:N49 where row 23 is header
                // We will read starting from row 23 (index 22)
                const range = { s: { r: 22, c: 1 }, e: { r: 1000, c: 13 } };

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    range: range,
                    defval: null,
                }) as any[][];

                if (jsonData.length === 0) {
                    reject(new Error("No data found in the expected range"));
                    return;
                }

                const rows = jsonData.slice(1);
                const portfolioItems: PortfolioItem[] = [];

                rows.forEach((row) => {
                    if (row.length < 1) return;
                    const symbol = String(row[0] || "");
                    if (!symbol || symbol === "Grand Total") return;

                    const item: PortfolioItem = {
                        symbol: symbol,
                        isin: String(row[1] || ""),
                        sector: String(row[2]) === "-" ? "Mutual Fund" : String(row[2] || ""),
                        instrumentType: cleanInstrumentType(String(row[3] || ""), row[2]),
                        quantity: Number(row[4]) || 0,
                        averagePrice: Number(row[9]) || 0,
                        currentValue: (Number(row[4]) || 0) * (Number(row[10]) || 0), // Qty * Previous Closing Price
                        pnl: Number(row[11]) || 0,
                    };

                    portfolioItems.push(item);
                });

                resolve(portfolioItems);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const parseGrowwExcel = async (file: File): Promise<PortfolioItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = "Sheet1";
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    reject(new Error(`Sheet "${sheetName}" not found. Please ensure this is a valid Groww portfolio file.`));
                    return;
                }

                // Groww format: Table starts at A11 (row index 10)
                // Columns:
                // 0: Stock Name
                // 1: ISIN
                // 2: Quantity
                // 3: Average Price
                // 4: Market Price (Not strictly needed if we have Current Value, but often useful)
                // 5: Not checked (Validation?)
                // 6: Current Value
                // 7: P&L
                const range = { s: { r: 10, c: 0 }, e: { r: 1000, c: 7 } };

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    range: range,
                    defval: null,
                }) as any[][];

                if (jsonData.length === 0) {
                    reject(new Error("No data found in the expected range"));
                    return;
                }

                const rows = jsonData.slice(1); // Skip header row
                const portfolioItems: PortfolioItem[] = [];

                rows.forEach((row) => {
                    if (row.length < 1) return;
                    const symbol = row[0] as string;
                    if (!symbol) return;

                    // Groww sometimes puts extra rows or summary at bottom, check required fields
                    if (!row[1] || typeof row[1] !== 'string' || !row[1].startsWith('INE')) {
                        // Simple check to ensure it looks like a stock row with ISIN, or skip
                        // If strict validation is needed, add here.
                        // But often footer rows don't have ISIN.
                        if (!row[1]) return;
                    }

                    const item: PortfolioItem = {
                        symbol: symbol,
                        isin: row[1] as string,
                        sector: symbol.includes("AMC") || symbol.includes("ETF") ? "ETF" : getSectorForISIN(row[1] as string), // Use sector from map (ISIN based)
                        instrumentType: symbol.includes("AMC") || symbol.includes("ETF") ? "ETF" : "Stocks",
                        quantity: Number(row[2]) || 0,
                        averagePrice: Number(row[3]) || 0,
                        currentValue: Number(row[6]) || 0,
                        pnl: Number(row[7]) || 0
                    };

                    portfolioItems.push(item);
                });

                resolve(portfolioItems);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const parseVestedExcel = async (file: File, conversionRate: number): Promise<PortfolioItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                // Vested usually has a sheet named "Trades" or "Holdings". The sample data shows "Trades".
                // But let's be safe and pick the first sheet if "Trades" isn't found, or look for specific columns.
                const sheetName = workbook.SheetNames.find(n => n === "Trades") || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    reject(new Error("No valid sheet found in Vested file"));
                    return;
                }

                // Vested Format (based on sample)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];

                if (jsonData.length === 0) {
                    reject(new Error("No data found"));
                    return;
                }

                const rows = jsonData.slice(1);
                const headers = jsonData[0] as string[];
                const nameIndex = headers.findIndex(h => h && h.toLowerCase().includes("name"));
                const tickerIndex = headers.findIndex(h => h && h.toLowerCase().includes("symbol") || h && h.toLowerCase().includes("ticker")) || 1;

                const portfolioItems: PortfolioItem[] = [];

                rows.forEach((row) => {
                    if (row.length < 2) return;
                    const ticker = String(row[tickerIndex] || "");
                    const name = nameIndex !== -1 ? String(row[nameIndex] || "") : ticker;

                    if (!ticker && !name) return;

                    const qty = Number(row[2]) || 0;
                    const avgPriceUsd = Number(row[5]) || 0;
                    const currentValueUsd = Number(row[4]) || 0;
                    const pnlUsd = Number(row[7]) || 0;

                    const item: PortfolioItem = {
                        symbol: name || ticker, // Use name for symbol as requested
                        isin: `US:${ticker || name}`, // Pseudo-ISIN for US stocks
                        sector: name.includes("ETF") ? "US ETF" : "US Equity",
                        instrumentType: name.includes("ETF") ? "US ETF" : "US Stocks",
                        quantity: qty,
                        averagePrice: avgPriceUsd * conversionRate,
                        currentValue: currentValueUsd * conversionRate,
                        pnl: pnlUsd * conversionRate,
                        source: "Vested"
                    };

                    portfolioItems.push(item);
                });

                resolve(portfolioItems);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const parseIndMoneyExcel = async (file: File, conversionRate: number): Promise<PortfolioItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    reject(new Error("No valid sheet found in IndMoney file"));
                    return;
                }

                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];

                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(rawData.length, 50); i++) {
                    if (rawData[i] && rawData[i].includes("Asset Type") && rawData[i].includes("Market Value")) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    reject(new Error("Could not find header row in IndMoney file"));
                    return;
                }

                const rows = rawData.slice(headerRowIndex + 1);

                const portfolioItems: PortfolioItem[] = [];

                rows.forEach((row) => {
                    if (row[2] !== "US_STOCK") return;

                    const sourceId = String(row[0] || "");
                    let ticker = String(row[6] || "");
                    if (sourceId) {
                        const parts = sourceId.split('_');
                        if (parts.length > 0) {
                            ticker = parts[parts.length - 1];
                        }
                    }

                    const investmentName = String(row[6] || ticker);

                    const qty = Number(row[13]) || 0;

                    const parseCurrency = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            return parseFloat(val.replace(/,/g, '')) || 0;
                        }
                        return 0;
                    };

                    const investedVal = parseCurrency(row[14]);
                    const currentVal = parseCurrency(row[15]);
                    const pnl = parseCurrency(row[17]);
                    const avgPrice = qty > 0 ? investedVal / qty : 0;

                    const item: PortfolioItem = {
                        symbol: investmentName || ticker, // Use Name/Ticker for symbol
                        isin: `US:${ticker || investmentName}`,
                        sector: investmentName.toLowerCase().includes("etf") ? "US ETF" : "US Equity",
                        instrumentType: investmentName.toLowerCase().includes("etf") ? "US ETF" : "US Stocks",
                        quantity: qty,
                        averagePrice: avgPrice,
                        currentValue: currentVal,
                        pnl: pnl,
                        source: "IndMoney"
                    };

                    portfolioItems.push(item);
                });

                resolve(portfolioItems);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
