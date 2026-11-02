import { buildXlsx } from './excel.js';
import { buildPdf } from './render.js';
import { download, safeFileName } from './util.js';
import { DEFAULT_TERMS, DEFAULT_TOTAL_LABEL, DEFAULT_SHEET_NAME } from './layout.js';
import { uid } from './seed.js';

export const fileBase = (q) => safeFileName(q.title || q.no || 'quotation');

export async function exportExcel(q, brand) {
  const blob = await buildXlsx(q, brand);
  download(blob, fileBase(q) + '.xlsx');
}
export async function exportPdf(q, brand) {
  const blob = await buildPdf(q, brand);
  download(blob, fileBase(q) + '.pdf');
}

export function nextQuoteNo(quotes) {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = quotes.filter((q) => (q.no || '').startsWith('Q' + ds)).length + 1;
  return `Q${ds}-${String(n).padStart(3, '0')}`;
}

export const cloneItems = (items) => (items || []).map((it) => ({ ...it, id: uid() }));

export function blankQuote(brandId, quotes) {
  const d = new Date();
  return {
    id: uid(), no: nextQuoteNo(quotes), title: '', customer: '', status: 'draft',
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    brandId, items: [], totalLabel: DEFAULT_TOTAL_LABEL, terms: [...DEFAULT_TERMS], sheetName: DEFAULT_SHEET_NAME,
  };
}

export function quoteFromTemplate(t, quotes) {
  const q = blankQuote(t.brandId, quotes);
  return { ...q, items: cloneItems(t.items), totalLabel: t.totalLabel, terms: [...(t.terms || [])], sheetName: t.sheetName || DEFAULT_SHEET_NAME, fromTemplate: t.name };
}
