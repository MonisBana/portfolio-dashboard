const XLSX = require('xlsx');

const wb = XLSX.readFile('src/sample_data/zerodha.xlsx');
const ws = wb.Sheets['Combined'];

// Range B23:N49
// Row 23 is header (index 22)
// Data starts row 24 (index 23)

const range = { s: { r: 22, c: 1 }, e: { r: 48, c: 13 } }; // B23 to N49 (0-indexed: B=1, N=13, 23=22, 49=48)
const opts = { header: 1, range: range, defval: null };

const data = XLSX.utils.sheet_to_json(ws, opts);

if (data.length > 0) {
    const headers = data[0];
    console.log('Headers:', JSON.stringify(headers));

    console.log('\nSample Data (First 3 rows):');
    data.slice(1, 4).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, JSON.stringify(row));
    });

    console.log(`\nTotal Rows Parsed: ${data.length - 1}`);
} else {
    console.log('No data found in specified range.');
}
