const XLSX = require('xlsx');

const wb = XLSX.readFile('src/sample_data/zerodha.xlsx');

console.log('Sheet Names:', wb.SheetNames);
console.log('\n');

// Focus on Combined sheet
const ws = wb.Sheets['Combined'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('=== Combined Sheet - First 20 rows ===\n');
data.slice(0, 20).forEach((row, i) => {
    // Filter out empty cells for cleaner output
    const nonEmpty = row.filter(cell => cell !== '');
    if (nonEmpty.length > 0) {
        console.log(`Row ${i}: ${JSON.stringify(nonEmpty)}`);
    }
});

console.log('\n=== All non-empty rows ===\n');
let headerRow = null;
data.forEach((row, i) => {
    const nonEmpty = row.filter(cell => cell !== '');
    if (nonEmpty.length >= 3) {
        if (!headerRow && (row.some(cell => String(cell).toLowerCase().includes('symbol') || String(cell).toLowerCase().includes('isin')))) {
            headerRow = i;
            console.log(`HEADER (Row ${i}):`, row);
        } else if (headerRow !== null) {
            console.log(`DATA (Row ${i}):`, row);
        }
    }
});
