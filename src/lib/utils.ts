import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PortfolioItem } from "./excel-parser"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const isValidISIN = (isin: string) => {
  if (!isin) return false;
  // Standard ISIN
  if (/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return true;
  // Custom ISINs for US stocks (US:TICKER) and Manual Assets (IN:Type_Id)
  if (isin.includes(":")) return true;
  return false;
};

export function mergePortfolioItems(items: PortfolioItem[]): PortfolioItem[] {
  const map = new Map<string, PortfolioItem>();

  for (const item of items) {
    // Determine the unique key for merging
    // Rule:
    // 1. If we have a valid ISIN, use it as the primary key.
    // 2. If ISIN is missing/invalid, fallback to Symbol, but use a distinct prefix 
    //    so it NEVER merges with an valid ISIN item.
    let key: string;

    if (item.isin && isValidISIN(item.isin)) {
      key = `ISIN:${item.isin}`;
    } else {
      // Fallback for missing or junk ISINs ("N/A", "", etc.)
      key = `SYMBOL:${item.symbol}`;
    }

    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key)!;

      // 1. Recalculate Average Price (Weighted Average)
      const existingInvested = existing.quantity * existing.averagePrice;
      const newInvested = item.quantity * item.averagePrice;
      const totalQty = existing.quantity + item.quantity;

      const newAveragePrice = totalQty > 0 ? (existingInvested + newInvested) / totalQty : 0;

      // 2. Summation fields
      existing.quantity = totalQty;
      existing.averagePrice = newAveragePrice;
      existing.currentValue += item.currentValue;
      existing.pnl += item.pnl;

      // 3. Metadata fields
      // Ensure we have the best data (e.g. valid ISIN if we just found it)
      if (!existing.isin && !key.startsWith("SYMBOL:")) {
        existing.isin = key;
      }
      existing.sector = existing.sector || item.sector;
      existing.instrumentType = existing.instrumentType || item.instrumentType;

      if (existing.source !== item.source) {
        existing.source = "Multiple";
      }
    }
  }

  return Array.from(map.values());
}
