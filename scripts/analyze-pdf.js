#!/usr/bin/env node
// Quick analyzer for Incident Report PDFs
// Usage: node scripts/analyze-pdf.js <path-to-pdf>

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

function containsCI(haystack, needle) {
  const h = haystack.replace(/\s+/g, ' ').toLowerCase();
  const n = needle.replace(/\s+/g, ' ').toLowerCase();
  return h.includes(n);
}

const re = {
  date: /(\d{4}[-\/]\d{2}[-\/]\d{2}|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\w*\s+\d{4}\b)/i,
  time: /(\b\d{1,2}:\d{2}(?::\d{2})?\b)/,
  incidentId: /(incident\s*id\s*[:#-]?\s*[A-Za-z0-9\-_/]+)/i,
};

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/analyze-pdf.js <path-to-pdf>');
    process.exit(2);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(2);
  }

  const buffer = fs.readFileSync(abs);
  const parsed = await pdfParse(buffer);
  const text = (parsed.text || '').replace(/\s+/g, ' ').trim();

  const titlePresent = containsCI(text, 'Incident Report');
  const datePresent = re.date.test(text);
  const timePresent = re.time.test(text);
  const incidentIdPresent = re.incidentId.test(text);

  const brandingPresent = ['Proof 360', 'Proof', 'Powered by'].some((b) => containsCI(text, b));
  const gmtNotePresent = containsCI(text, 'Reports are created in GMT standard time');
  const mapPresent = containsCI(text, 'Map');

  const statusHints = ['Resolved', 'Not resolved', 'Dismissed', 'Escalated', 'Dispatch'];
  const statusesFound = statusHints.filter((s) => containsCI(text, s));

  const typeHints = ['Unusual Behaviour', 'Object Motion', 'LPR'];
  const typesFound = typeHints.filter((t) => containsCI(text, t));

  const result = {
    file: abs,
    pages: parsed.numpages || 0,
    preview: text.slice(0, 400),
    checks: {
      titlePresent,
      datePresent,
      timePresent,
      incidentIdPresent,
      brandingPresent,
      gmtNotePresent,
      mapPresent,
      statusesFound,
      typesFound,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Analyzer error:', err?.message || err);
  process.exit(1);
});
