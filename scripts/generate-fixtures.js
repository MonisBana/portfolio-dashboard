const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname, '..', 'cypress', 'fixtures');

if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Zerodha Sample
// Parser reads from B23 (row 22, col 1) through N
// Range { s: { r: 22, c: 1 }, e: { r: 1000, c: 13 } }
// row[0]=Symbol, row[1]=ISIN, row[2]=Sector, row[3]=Instrument, row[4]=Qty,
// row[9]=Avg Cost, row[10]=LTP, row[11]=P&L
// So columns are: B(Symbol), C(ISIN), D(Sector), E(Instrument), F(Qty), G, H, I, J, K(Avg), L(LTP), M(P&L), N
// Create proper structure with column A empty
const zerodhaHeader = [null, "Symbol", "ISIN", "Sector", "Instrument", "Qty.", "Cell6", "Cell7", "Cell8", "Cell9", "Avg. Cost", "LTP", "P&L", "Net Chg"];
const zerodhaRow1 = [null, "INFY", "INE009A01021", "IT", "-", 10, null, null, null, null, 1400, 1500, 1000, 0];
const zerodhaRow2 = [null, "RELIANCE", "INE002A01018", "Oil & Gas", "-", 5, null, null, null, null, 2400, 2500, 500, 0];
// Pad to row 22 (0-indexed), then add header at row 22, data at row 23+
const paddedZerodhaData = [];
for (let i = 0; i < 22; i++) paddedZerodhaData.push([]);
paddedZerodhaData.push(zerodhaHeader);
paddedZerodhaData.push(zerodhaRow1);
paddedZerodhaData.push(zerodhaRow2);

const wbZerodha = XLSX.utils.book_new();
const wsZerodha = XLSX.utils.aoa_to_sheet(paddedZerodhaData);
XLSX.utils.book_append_sheet(wbZerodha, wsZerodha, "Combined");
XLSX.writeFile(wbZerodha, path.join(fixturesDir, 'zerodha_sample.xlsx'));
console.log("Created zerodha_sample.xlsx");

// 2. Groww Sample
// Parser reads from A11 (row 10, col 0) through H
// row[0]=Stock Name, row[1]=ISIN, row[2]=Qty, row[3]=Avg Price, row[6]=Current Value, row[7]=P&L
const growwHeader = ["Stock Name", "ISIN", "Quantity", "Avg Price", "Market Price", "Validation", "Current Value", "P&L"];
const growwRow1 = ["TATA MOTORS", "INE155A01022", 20, 400, 450, null, 9000, 1000];
const growwRow2 = ["HDFC BANK", "INE040A01034", 15, 1500, 1600, null, 24000, 1500];
const paddedGrowwData = [];
for (let i = 0; i < 10; i++) paddedGrowwData.push([]);
paddedGrowwData.push(growwHeader);
paddedGrowwData.push(growwRow1);
paddedGrowwData.push(growwRow2);

const wbGroww = XLSX.utils.book_new();
const wsGroww = XLSX.utils.aoa_to_sheet(paddedGrowwData);
XLSX.utils.book_append_sheet(wbGroww, wsGroww, "Sheet1");
XLSX.writeFile(wbGroww, path.join(fixturesDir, 'groww_sample.xlsx'));
console.log("Created groww_sample.xlsx");

// 3. Vested Sample
// Parser reads header from row 0, looks for "name" column and "ticker" column
// row[2]=Qty, row[4]=Current Value, row[5]=Avg Price, row[7]=P&L
const vestedHeader = ["Date", "Name", "Quantity", "Price", "Current Value", "Avg Price", "Invested Amount", "P&L", "Weight"];
const vestedRow1 = ["2023-01-01", "Apple Inc", 2, 180, 360, 150, 300, 60, "10%"];
const vestedRow2 = ["2023-01-01", "Microsoft Corp", 1, 350, 350, 300, 300, 50, "10%"];
const vestedData = [vestedHeader, vestedRow1, vestedRow2];

const wbVested = XLSX.utils.book_new();
const wsVested = XLSX.utils.aoa_to_sheet(vestedData);
XLSX.utils.book_append_sheet(wbVested, wsVested, "Trades");
XLSX.writeFile(wbVested, path.join(fixturesDir, 'vested_sample.xlsx'));
console.log("Created vested_sample.xlsx");

// 4. IndMoney Sample - not needed for current tests, skip for now

console.log("Fixtures regenerated successfully!");
