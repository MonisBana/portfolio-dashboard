const XLSX = require('xlsx');

// Mocking the cleanup function
const cleanInstrumentType = (rawType) => {
    if (!rawType) return "";
    let type = rawType.replace(/[{}]/g, "").trim();
    if (type === "-") return "Stocks";
    return type;
};

try {
    const workbook = XLSX.readFile('src/sample_data/Groww.xlsx');
    const sheetName = "Sheet1";
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found.`);
    }

    // Groww format: Table starts at A11 (row index 10)
    const range = { s: { r: 10, c: 0 }, e: { r: 1000, c: 7 } };

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: range,
        defval: null,
    });

    if (jsonData.length === 0) {
        throw new Error("No data found in the expected range");
    }

    const rows = jsonData.slice(1); // Skip header row
    const portfolioItems = [];

    rows.forEach((row) => {
        if (row.length < 1) return;
        const symbol = row[0];
        if (!symbol) return;

        // Validation mimic
        if (!row[1] || typeof row[1] !== 'string' || !row[1].startsWith('INE')) {
            if (!row[1]) return;
        }

        const item = {
            symbol: symbol,
            isin: row[1],
            sector: "",
            instrumentType: "Probable Equity",
            quantity: Number(row[2]) || 0,
            averagePrice: Number(row[3]) || 0,
            currentValue: Number(row[6]) || 0,
            pnl: Number(row[7]) || 0,
            dayChange: 0,
            dayChangePercentage: 0
        };

        portfolioItems.push(item);
    });

    console.log(`Successfully parsed ${portfolioItems.length} items.`);
    if (portfolioItems.length > 0) {
        console.log("Sample Item:", JSON.stringify(portfolioItems[0], null, 2));
    }

    // Check specific known item
    const aavas = portfolioItems.find(i => i.symbol === "AAVAS FINANCIERS LIMITED");
    if (aavas) {
        console.log("Verification Passed: Found AAVAS FINANCIERS LIMITED");
        console.log("Qty:", aavas.quantity);
        console.log("Avg:", aavas.averagePrice);
    } else {
        console.error("Verification Failed: AAVAS FINANCIERS LIMITED not found");
        process.exit(1);
    }

} catch (error) {
    console.error("Verification Error:", error);
    process.exit(1);
}
