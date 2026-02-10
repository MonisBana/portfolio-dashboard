import { db } from "../db";
import * as XLSX from "xlsx";

/**
 * Generates a CSV export of the portfolio and triggers a browser download.
 * Returns a summary string for the AI.
 */
export const generateCSV = async (): Promise<string> => {
    const items = await db.items.toArray();
    if (items.length === 0) {
        return "No portfolio items to export.";
    }

    const ws = XLSX.utils.json_to_sheet(items);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "portfolio_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return `Successfully exported ${items.length} items to portfolio_export.csv.`;
};

/**
 * Retrieves the current portfolio data from Dexie for AI context.
 * Returns a JSON-serializable summary.
 */
export const getPortfolioData = async (): Promise<string> => {
    const items = await db.items.toArray();
    if (items.length === 0) {
        return "The portfolio is empty. No holdings found.";
    }

    const totalValue = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalPnl = items.reduce((sum, item) => sum + (item.pnl || 0), 0);

    const summary = {
        totalHoldings: items.length,
        totalPortfolioValue: totalValue,
        totalPnL: totalPnl,
        holdings: items.map((item) => ({
            symbol: item.symbol,
            sector: item.sector,
            instrumentType: item.instrumentType,
            quantity: item.quantity,
            averagePrice: item.averagePrice,
            currentValue: item.currentValue,
            pnl: item.pnl,
            source: item.source || "Unknown",
            owner: item.owner || "Self",
        })),
    };

    return JSON.stringify(summary, null, 2);
};
