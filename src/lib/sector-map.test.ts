import { getSectorForISIN } from "./stock-sector-map";

describe("Sector Mapping (ISIN)", () => {
    test("should return correct sector for known ISINs", () => {
        // Reliance
        expect(getSectorForISIN("INE002A01018")).toBe("ENERGY");
        // TCS
        expect(getSectorForISIN("INE467B01029")).toBe("IT");
        // HDFC Bank
        expect(getSectorForISIN("INE040A01026")).toBe("FINANCIAL SERVICES");
        // Maruti
        expect(getSectorForISIN("INE585B01010")).toBe("AUTOMOBILE");
    });

    test("should handle whitespace and case sensitivity", () => {
        expect(getSectorForISIN(" ine002a01018 ")).toBe("ENERGY");
    });

    test("should return empty string for unknown ISINs", () => {
        expect(getSectorForISIN("UNKNOWN_ISIN_123")).toBe("");
    });
});
