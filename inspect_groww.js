const XLSX = require('xlsx');

try {
    const wb = XLSX.readFile('src/sample_data/Groww.xlsx');
    const ws = wb.Sheets['Sheet1'];
    // Row 11 is index 10.
    const range = { s: { r: 10, c: 0 }, e: { r: 15, c: 7 } }; // A11:H16
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: range, defval: null });

    console.log('--- HEADERS (Row 11) ---');
    console.log(JSON.stringify(data[0]));

    console.log('--- DATA (Row 12) ---');
    console.log(JSON.stringify(data[1]));

} catch (e) {
    console.error(e);
}
