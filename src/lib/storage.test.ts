import { mergePortfolioItems, mergeUploadedFiles, UploadedFile } from "./storage";
import { PortfolioItem } from "./excel-parser";

describe("Storage Logic", () => {

    describe("mergePortfolioItems", () => {
        const item = (source: string, owner?: string, symbol: string = "TEST"): PortfolioItem => ({
            symbol,
            isin: "IN:TEST",
            sector: "Test",
            instrumentType: "Stock",
            quantity: 1,
            averagePrice: 100,
            currentValue: 120,
            pnl: 20,
            source,
            owner
        });

        it("should add new items to empty portfolio", () => {
            const current: PortfolioItem[] = [];
            const newItems = [item("Zerodha", "Self")];
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(1);
            expect(result[0].source).toBe("Zerodha");
            expect(result[0].owner).toBe("Self");
        });

        it("should replace items for same broker and owner", () => {
            const current = [item("Zerodha", "Self", "OLD")];
            const newItems = [item("Zerodha", "Self", "NEW")];
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe("NEW");
        });

        it("should KEEP items for different broker", () => {
            const current = [item("Groww", "Self")];
            const newItems = [item("Zerodha", "Self")];
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(2);
            expect(result.find(i => i.source === "Groww")).toBeDefined();
            expect(result.find(i => i.source === "Zerodha")).toBeDefined();
        });

        it("should KEEP items for different owner (same broker)", () => {
            const current = [item("Zerodha", "Spouse")];
            const newItems = [item("Zerodha", "Self")];
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(2);
            expect(result.find(i => i.owner === "Spouse")).toBeDefined();
            expect(result.find(i => i.owner === "Self")).toBeDefined();
        });

        it("should handle undefined owner as Self", () => {
            const current = [item("Zerodha", undefined)]; // implied Self
            const newItems = [item("Zerodha", "Self")];
            // Should replace
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(1);
        });

        it("should replace undefined owner with incoming owner if matching", () => {
            // If we upload for "Self", and existing item has no owner (undefined), it matches.
            const current = [item("Zerodha")]; // undefined owner
            const newItems = [item("Zerodha", "Self", "NEW")];
            const result = mergePortfolioItems(current, newItems, "Zerodha", "Self");
            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe("NEW");
        });
    });

    describe("mergeUploadedFiles", () => {
        const file = (id: string, source: string, owner?: string): UploadedFile => ({
            id,
            filename: "test.xlsx",
            size: 100,
            source,
            owner,
            status: "completed",
            description: "",
            uploadDate: ""
        });

        it("should add new file", () => {
            const current: UploadedFile[] = [];
            const result = mergeUploadedFiles(current, file("1", "Zerodha", "Self"));
            expect(result).toHaveLength(1);
        });

        it("should replace file for same broker and owner", () => {
            const current = [file("1", "Zerodha", "Self")];
            const result = mergeUploadedFiles(current, file("2", "Zerodha", "Self"));
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("2");
        });

        it("should keep file for different owner", () => {
            const current = [file("1", "Zerodha", "Spouse")];
            const result = mergeUploadedFiles(current, file("2", "Zerodha", "Self"));
            expect(result).toHaveLength(2);
        });
    });
});
