// 「系统方案」版式的 Canvas 绘制（实时预览 + PDF）
import { SYS, SYS_DEFAULTS, SYS_TOTAL_LABEL, parseBold, sysColor } from './layout2.js';
import { num } from './layout.js';
import { sysLogoBox, sysPicBox, sysCardBox } from './excel2.js';

const PT = 96 / 72, EMU = 9525;
const COLX = SYS.colPx.reduce((a, w, i) => (a.push(a[i] + w), a), [0]);
const W = COLX[9];
const GRID = '#ADABAB', LABEL = '#747070', TEXT = '#3A3838', SOFT = '#404040';
const F = (w, size, fam = 'Poppins') => `${w} ${(size * PT).toFixed(2)}px ${fam}, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif`;
const money = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 富文本换行绘制：runs=[{text,font,color}]
function layoutRuns(g, runs, maxW) {
  const lines = [[]]; let lw = 0;
  for (const r of runs) {
    const parts = r.text.split('\n');
    parts.forEach((part, pi) => {
      if (pi > 0) { lines.push([]); lw = 0; }
      const tokens = part.match(/\s+|[^\s]+/g) || [];
      for (const t of tokens) {
        g.font = r.font;
        const w = g.measureText(t).width;
        const cur = lines[lines.length - 1];
        if (lw + w > maxW && cur.some((x) => x.text.trim()) && t.trim()) { lines.push([]); lw = 0; }
        const line = lines[lines.length - 1];
        if (!line.length && !t.trim()) continue;
        line.push({ ...r, text: t, w }); lw += w;
      }
    });
  }
  return lines.map((l) => { while (l.length && !l[l.length - 1].text.trim()) l.pop(); return l; });
}
function drawRuns(g, runs, x, y, w, h, { align = 'center', valign = 'middle', pad = 4, lh = 1.35 } = {}) {
  const lines = layoutRuns(g, runs, w - pad * 2);
  const size = Math.max(...runs.map((r) => parseFloat(/([\d.]+)px/.exec(r.font)[1])), 10);
  const L = size * lh;
  const totalH = lines.length * L;
  let ty = valign === 'top' ? y + pad + L / 2 : y + h / 2 - totalH / 2 + L / 2;
  g.textBaseline = 'middle';
  for (const line of lines) {
    const lw = line.reduce((s, t) => s + t.w, 0);
    let tx = align === 'center' ? x + (w - lw) / 2 : align === 'right' ? x + w - pad - lw : x + pad;
    for (const t of line) { g.font = t.font; g.fillStyle = t.color; g.textAlign = 'left'; g.fillText(t.text, tx, ty); tx += t.w; }
    ty += L;
  }
}
const txt = (g, text, x, y, w, h, font, color, align = 'center', valign = 'middle', pad = 4) =>
  drawRuns(g, [{ text: String(text ?? ''), font, color }], x, y, w, h, { align, valign, pad });

function rect(g, x, y, w, h, { fill, stroke = GRID, sides = 'tblr' } = {}) {
  if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
  if (!stroke) return;
  g.fillStyle = stroke;
  if (sides.includes('t')) g.fillRect(x, y, w, 1);
  if (sides.includes('b')) g.fillRect(x, y + h - 1, w, 1);
  if (sides.includes('l')) g.fillRect(x, y, 1, h);
  if (sides.includes('r')) g.fillRect(x + w - 1, y, 1, h);
}
const cx = (a, b) => [COLX[a], COLX[b + 1] - COLX[a]];

export function layoutRows2(quote) {
  const S = { ...SYS_DEFAULTS(), ...(quote.sys || {}) };
  const items = quote.items && quote.items.length ? quote.items : [{}];
  const R = SYS.rowH;
  const rows = [
    { t: 'r1', h: R.r1 }, { t: 'date', h: R.r2 }, { t: 'sp', h: R.r3 }, { t: 'infoHead', h: R.r4 },
    { t: 'info', i: 0, h: R.info }, { t: 'info', i: 1, h: R.info }, { t: 'info', i: 2, h: R.info }, { t: 'sp', h: R.r8 },
    { t: 'title', h: R.title }, { t: 'sub', h: R.sub }, { t: 'head', h: R.head },
    ...items.map((it, i) => ({ t: 'item', it, i, h: num(it.rowHeight) || R.item })),
    { t: 'total', h: R.total }, { t: 'sp', h: R.gap }, { t: 'termsHead', h: R.termsHead },
    { t: 'terms', h: R.terms * 6 }, { t: 'sp', h: R.r27 },
    ...(S.card ? [{ t: 'card', h: R.card }] : []),
  ];
  let y = 0;
  rows.forEach((r) => { r.h *= PT; r.y = y; y += r.h; });
  return { rows, height: y, width: W, S };
}

const imgCache = new Map();
const load = (u) => {
  if (!u) return Promise.resolve(null);
  if (!imgCache.has(u)) imgCache.set(u, new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; }));
  return imgCache.get(u);
};

export async function renderSheet2(quote, brand, scale = 2, opts = {}) {
  const { rows, height, S } = layoutRows2(quote);
  const P = sysColor(brand);
  const logoUrl = brand.sysLogo || brand.logo;
  const urls = [logoUrl, S.card, ...(quote.items || []).map((i) => i.image)].filter(Boolean);
  const imgs = new Map();
  await Promise.all(urls.map(async (u) => imgs.set(u, await load(u))));
  const c = opts.canvas || document.createElement('canvas');
  c.width = Math.ceil(W * scale); c.height = Math.ceil(height * scale);
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, height);
  g.imageSmoothingQuality = 'high';
  const contact = [['Name', S.contact.name], ['Phone/WhatsApp/Wechat:', S.contact.phone], ['Email:', S.contact.email]];
  let total = 0;
  const firstItem = rows.find((r) => r.t === 'item');
  const lastItem = [...rows].reverse().find((r) => r.t === 'item');

  for (const r of rows) {
    const { y, h } = r;
    if (r.t === 'r1') {
      const im = logoUrl && imgs.get(logoUrl);
      if (im) { const b = sysLogoBox({ w: im.naturalWidth, h: im.naturalHeight }); g.drawImage(im, b.x / EMU, y + b.y / EMU, b.w / EMU, b.h / EMU); }
      const [x0, w0] = cx(4, 8);
      txt(g, brand.sysCompany || brand.company || '', x0, y, w0, h, F(400, 36), TEXT, 'right', 'middle', 2);
    } else if (r.t === 'date') {
      rect(g, 0, y, W, h, { sides: 'b' });
      if (quote.date) txt(g, `[Date: ${quote.date.replace(/-/g, '/')}]`, 0, y, COLX[2], h, F(500, 12), LABEL, 'left', 'middle', 2);
    } else if (r.t === 'infoHead') {
      g.fillStyle = P; g.fillRect(0, y, W, h);
      txt(g, 'PROJECT INFORMATION', 0, y, COLX[5], h, F(500, 14), '#fff', 'left', 'middle', 2);
      txt(g, 'CONCT US', COLX[5], y, W - COLX[5], h, F(500, 14), '#fff', 'left', 'middle', 2);
    } else if (r.t === 'info') {
      const [pl, pv] = S.project[r.i] || ['', ''];
      const isLast = r.i === 2;
      rect(g, 0, y, W, h, { sides: (isLast ? 'b' : '') + 'lr' });
      if (pl) txt(g, `[${pl}]`, 0, y, COLX[2], h, F(500, 12), LABEL, 'left', 'middle', 2);
      txt(g, pv, COLX[2], y, COLX[4] - COLX[2], h, F(400, 12), SOFT, 'right', 'middle', 2);
      txt(g, `[${contact[r.i][0]}]`, COLX[5], y, COLX[7] - COLX[5], h, F(500, 12), LABEL, 'left', 'middle', 2);
      const isMail = r.i === 2 && contact[2][1];
      txt(g, contact[r.i][1], COLX[7], y, W - COLX[7], h, F(400, 12), isMail ? '#0563C1' : SOFT, 'right', 'middle', 2);
      if (isMail) { g.font = F(400, 12); const tw = g.measureText(contact[2][1]).width; g.fillStyle = '#0563C1'; g.fillRect(W - 2 - tw, y + h / 2 + 8, tw, 1); }
    } else if (r.t === 'title') {
      rect(g, 0, y, W, h, { sides: 'tlr' });
      const runs = [];
      if (S.titleHL) runs.push({ text: S.titleHL, font: F(700, 28), color: P });
      if (S.titleRest) runs.push({ text: (S.titleHL ? ' ' : '') + S.titleRest, font: F(700, 28), color: '#000' });
      drawRuns(g, runs, 0, y, W, h, { valign: 'top', pad: 2 });
    } else if (r.t === 'sub') {
      rect(g, 0, y, W, h, { sides: 'blr' });
      drawRuns(g, parseBold(S.subtitle).map((p) => ({ text: p.text, font: F(p.bold ? 700 : 300, 16), color: '#000' })), 0, y, W, h, { valign: 'top', pad: 2 });
    } else if (r.t === 'head') {
      g.fillStyle = P; g.fillRect(0, y, W, h);
      const heads = [[0, 0, 'Item #'], [1, 3, 'Parts & Warranty'], [4, 4, 'Image'], [5, 5, 'Specification']];
      heads.forEach(([a, b, t]) => { const [x0, w0] = cx(a, b); txt(g, t, x0, y, w0, h, F(500, 14), '#fff'); rect(g, x0, y, w0, h, { sides: 'lr' }); });
      [[6, 'Quantity ', '(PCS)'], [7, 'Unit price ', '(USD)'], [8, 'Amount ', '(USD)']].forEach(([i, a, u]) => {
        const [x0, w0] = cx(i, i);
        drawRuns(g, [{ text: a, font: F(500, 14), color: '#fff' }, { text: u, font: F(500, 8), color: '#fff' }], x0, y, w0, h);
        rect(g, x0, y, w0, h, { sides: 'lr' });
      });
    } else if (r.t === 'item') {
      const it = r.it;
      [[0, 0], [1, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]].forEach(([a, b]) => { const [x0, w0] = cx(a, b); rect(g, x0, y, w0, h); });
      txt(g, String(r.i + 1), 0, y, COLX[1], h, F(600, 12), TEXT);
      const runs = [];
      parseBold(it.name).forEach((p) => runs.push({ text: p.text, font: F(p.bold ? 700 : 400, 12), color: TEXT }));
      if (it.nameBold) runs.push({ text: it.nameBold, font: F(700, 12), color: TEXT });
      if (it.warranty) runs.push({ text: '\n', font: F(400, 12), color: TEXT }, { text: `[${it.warranty}]`, font: F(600, 12), color: P });
      const [bx, bw] = cx(1, 3);
      drawRuns(g, runs, bx, y, bw, h, { pad: 2 });
      const [fx, fw] = cx(5, 5);
      drawRuns(g, parseBold(it.model).map((p) => ({ text: p.text, font: F(p.bold ? 700 : 400, 12), color: TEXT })), fx, y, fw, h, { pad: 2 });
      const q = num(it.qty), p = num(it.price);
      if (q !== null) txt(g, String(q), COLX[6], y, SYS.colPx[6], h, F(400, 12), TEXT);
      if (p !== null) txt(g, money(p), COLX[7], y, SYS.colPx[7], h, F(400, 12), TEXT);
      if (it.amountNote) txt(g, it.amountNote, COLX[8], y, SYS.colPx[8], h, F(400, 12), '#FF0000');
      else { const a = q !== null && p !== null ? q * p : 0; total += a; txt(g, money(a), COLX[8], y, SYS.colPx[8], h, F(400, 12), TEXT); }
      const im = it.image && imgs.get(it.image);
      if (im) { const b = sysPicBox({ w: im.naturalWidth, h: im.naturalHeight }, COLX[4] * EMU, y * EMU, h / PT); g.drawImage(im, b.x / EMU, b.y / EMU, b.w / EMU, b.h / EMU); }
    } else if (r.t === 'total') {
      rect(g, 0, y, COLX[8], h, { fill: '#F2F2F2' }); rect(g, COLX[8], y, SYS.colPx[8], h, { fill: '#F2F2F2' });
      txt(g, quote.totalLabel || SYS_TOTAL_LABEL, 0, y, COLX[8], h, F(500, 14), TEXT);
      txt(g, money(Math.round(total * 100) / 100), COLX[8], y, SYS.colPx[8], h, F(500, 14), TEXT);
    } else if (r.t === 'termsHead') {
      g.fillStyle = P; g.fillRect(0, y, W, h);
      txt(g, 'TERMS OF SALE AND OTHER COMMENTS', 0, y, W, h, F(500, 14), '#fff', 'left', 'middle', 2);
    } else if (r.t === 'terms') {
      rect(g, 0, y, COLX[5], h); rect(g, COLX[5], y, W - COLX[5], h);
      const b = (l) => (l || []).filter((t) => t.trim()).map((t) => '• ' + t).join('\n');
      drawRuns(g, [{ text: b(S.termsL), font: F(400, 12), color: '#404040' }], 0, y, COLX[5], h, { align: 'left', pad: 3 });
      drawRuns(g, [{ text: b(S.termsR), font: F(400, 12), color: LABEL }], COLX[5], y, W - COLX[5], h, { align: 'left', pad: 3 });
    } else if (r.t === 'card') {
      const im = imgs.get(S.card);
      if (im) { const b = sysCardBox({ w: im.naturalWidth, h: im.naturalHeight }, 0); g.drawImage(im, b.x / EMU, y + b.y / EMU, b.w / EMU, b.h / EMU); }
    }
  }
  if (firstItem && lastItem && opts.pageBreaks) {
    const breaks = paginate2(rows).slice(1).map((p) => rows[p[0]].y);
    g.setLineDash([6, 4]); g.strokeStyle = '#4C6EF5'; g.lineWidth = 1.2;
    breaks.forEach((by) => { g.beginPath(); g.moveTo(0, by); g.lineTo(W, by); g.stroke(); });
    g.setLineDash([]);
  }
  return { canvas: c, rows, height };
}

// A4 纵向，按宽度缩放为 1 页宽
const MM = 25.4 / 96;
export const PAGE2 = (() => {
  const m = SYS.margins;
  const pw = 210 - (m.left + m.right) * 25.4;
  const ph = 297 - (m.top + m.bottom) * 25.4;
  const scale = pw / (W * MM);
  return { scale, rowsPx: ph / (MM * scale), left: m.left * 25.4, top: m.top * 25.4 };
})();
export function paginate2(rows) {
  const pages = []; let cur = []; let used = 0;
  rows.forEach((r, i) => {
    if (cur.length && used + r.h > PAGE2.rowsPx) { pages.push(cur); cur = []; used = 0; }
    cur.push(i); used += r.h;
  });
  if (cur.length) pages.push(cur);
  return pages;
}
export const SHEET2_W = W;
