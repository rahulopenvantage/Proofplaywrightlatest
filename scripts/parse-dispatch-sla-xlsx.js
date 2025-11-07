// Parse the Dispatch SLA creation.xlsx to list test cases and steps
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const xlsxPath = path.resolve(projectRoot, 'e2e', 'Reports', 'Dispatch_SLA_Reports', 'Dispatch SLA creation.xlsx');

if (!fs.existsSync(xlsxPath)) {
  console.error(`[parse-dispatch-sla-xlsx] File not found: ${xlsxPath}`);
  process.exit(1);
}

try {
  const wb = xlsx.readFile(xlsxPath);
  const output = [];

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (!rows.length) return;

    // Assume first row is header
    const headers = rows[0].map((h) => String(h).trim());
    const records = rows.slice(1).map((r, idx) => {
      const rec = {};
      headers.forEach((h, i) => { rec[h || `col_${i+1}`] = (r[i] ?? '').toString().trim(); });
      rec.__row = idx + 2; // Excel row number
      return rec;
    });

    output.push({ sheet: sheetName, headers, recordsCount: records.length, sample: records.slice(0, 10) });
  });

  console.log(JSON.stringify({ file: xlsxPath, sheets: output }, null, 2));
} catch (err) {
  console.error(`[parse-dispatch-sla-xlsx] Error: ${err.message}`);
  process.exit(2);
}
