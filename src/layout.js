// 模板版式常量（取自原始 Excel 模板，单位：像素按 Excel 96dpi 计算）
export const COL_PX = [205, 201, 222, 134, 134, 138]; // A..F
export const COL_EMU = COL_PX.map((p) => p * 9525);
export const EMU_PER_PT = 12700;
export const PT2PX = 96 / 72;

export const ROW_H = {
  title: 42,
  contact: 45.95,
  header: 32.25,
  item: 125,
  total: 30.75,
  term: 17.1,
};

export const HEADERS = [
  'Parts & Warranty                             ',
  'Picture',
  'Specification',
  'Quantity            (PCS)                   ',
  'Unit price           (RMB)',
  'Amount              (RMB)',
];

export const DEFAULT_TOTAL_LABEL = 'EXW Factory Total Cost （Original）';
export const DEFAULT_TERMS = [
  'Qutation Validity: 10 Days',
  'Package: Standard export package, Composite material box',
  'Lead time:15 days after receiving payment',
  'Sea Port:Shanghai/Ningbo',
  'Payment:100% TT payment before shipping.',
];
export const DEFAULT_PRIMARY = '#1651A3';
export const DEFAULT_ACCENT = '#00B050';
export const DEFAULT_SHEET_NAME = '10';

// A 列文字 = 名称 + 质保（多行）
export function partText(item) {
  const name = ((item.name || '') + (item.nameBold || '')).replace(/\r/g, '').replace(/\*\*/g, '');
  const w = (item.warranty || '').trim();
  return w ? (name ? name + '\n' + w : w) : name;
}

export function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function itemAmount(it) {
  if (it.amountNote) return 0;
  const q = num(it.qty), p = num(it.price);
  return q === null || p === null ? 0 : Math.round(q * p * 100) / 100;
}

export function quoteTotal(q) {
  return (q.items || []).reduce((s, it) => s + itemAmount(it), 0);
}
