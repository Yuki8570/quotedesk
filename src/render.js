// 按 Excel 模板版式在 Canvas 上绘制报价单（用于实时预览与 PDF 导出）
import { PDFDocument } from 'pdf-lib';
import {
  COL_PX, ROW_H, PT2PX, HEADERS, DEFAULT_PRIMARY, DEFAULT_ACCENT, DEFAULT_TOTAL_LABEL,
  partText, num, itemAmount,
} from './layout.js';
import { imageInfo, logoBox, pictureBox, dataUrlToBytes } from './excel.js';

const BODY = 'Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
const TITLE = 'Arial, "Liberation Sans", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif';
const EMU_PX = 9525;
const SHEET_W = COL_PX.reduce((a, b) => a + b, 0);
const COL_X = COL_PX.reduce((acc, w, i) => (acc.push(acc[i] + w), acc), [0]);

const imgCache = new Map();
export function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = url;
    }));
  }
  return imgCache.get(url);
}

// Excel 风格换行：保留空格宽度，行首/行尾空格忽略，中文逐字断行
function wrapLines(g, text, maxW, wrap) {
  const out = [];
  for (const para of String(text).split('\n')) {
    if (!wrap) { out.push(para.trim()); continue; }
    const tokens = para.match(/[⺀-鿿＀-￯]|[^\s⺀-鿿＀-￯]+|\s+/g) || [''];
    let line = '';
    for (const t of tokens) {
      const test = line + t;
      if (line.trim() && g.measureText(test.trimEnd()).width > maxW && t.trim()) {
        out.push(line.trim()); line = t;
      } else line = test;
    }
    out.push(line.trim());
  }
  return out;
}

function drawText(g, text, x, y, w, h, { font, color = '#000', align = 'center', wrap = true, pad = 4 }) {
  g.font = font; g.fillStyle = color; g.textBaseline = 'middle';
  const size = parseFloat(/(\d+(\.\d+)?)px/.exec(font)[1]);
  const lh = size * 1.22;
  const lines = wrapLines(g, text, w - pad * 2, wrap);
  const top = y + h / 2 - (lines.length * lh) / 2 + lh / 2;
  lines.forEach((ln, i) => {
    g.textAlign = align;
    const tx = align === 'center' ? x + w / 2 : align === 'left' ? x + pad : x + w - pad;
    g.fillText(ln, tx, top + i * lh);
  });
}

function drawRich(g, runs, x, y, w, h) {
  // 单行富文本居中
  let total = 0;
  runs.forEach((r) => { g.font = r.font; r.w = g.measureText(r.text).width; total += r.w; });
  let cx = x + (w - total) / 2;
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#000';
  runs.forEach((r) => { g.font = r.font; g.fillText(r.text, cx, y + h / 2); cx += r.w; });
}

const money = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function drawAccounting(g, v, x, y, w, h, font) {
  g.font = font; g.fillStyle = '#000'; g.textBaseline = 'middle';
  const sp = g.measureText(' ').width;
  g.textAlign = 'left'; g.fillText('¥', x + sp + 2, y + h / 2);
  g.textAlign = 'right';
  if (v === null) return;
  g.fillText(v === 0 ? '-  ' : money(v), x + w - sp - 2, y + h / 2);
}

function hline(g, x1, x2, y, color) {
  g.fillStyle = color; g.fillRect(x1, Math.round(y) - 0.5, x2 - x1, 1);
}
function vline(g, x, y1, y2, color) {
  g.fillStyle = color; g.fillRect(Math.round(x) - 0.5, y1, 1, y2 - y1);
}

/** 计算各行高度（像素），返回布局信息 */
export function layoutRows(quote) {
  const items = quote.items && quote.items.length ? quote.items : [{}];
  const rows = [
    { type: 'title', h: ROW_H.title * PT2PX },
    { type: 'contact', h: ROW_H.contact * PT2PX },
    { type: 'header', h: ROW_H.header * PT2PX },
    ...items.map((it) => ({ type: 'item', it, h: (num(it.rowHeight) || ROW_H.item) * PT2PX })),
    { type: 'total', h: ROW_H.total * PT2PX },
    ...(quote.terms || []).map((t) => ({ type: 'term', text: t, h: ROW_H.term * PT2PX })),
  ];
  let y = 0;
  rows.forEach((r) => { r.y = y; y += r.h; });
  return { rows, height: y, width: SHEET_W };
}

/** 渲染整张表到 canvas（scale = 每个工作表像素对应的画布像素） */
export async function renderSheet(quote, brand, scale = 2, opts = {}) {
  const { rows, height } = layoutRows(quote);
  const urls = [brand.logo, ...rows.filter((r) => r.type === 'item').map((r) => r.it.image)];
  const imgs = new Map();
  await Promise.all(urls.filter(Boolean).map(async (u) => imgs.set(u, await loadImage(u))));

  const c = opts.canvas || document.createElement('canvas');
  c.width = Math.ceil(SHEET_W * scale);
  c.height = Math.ceil(height * scale);
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.fillStyle = '#fff'; g.fillRect(0, 0, SHEET_W, height);
  g.imageSmoothingQuality = 'high';

  const P = brand.color || DEFAULT_PRIMARY;
  const A = brand.accent || DEFAULT_ACCENT;
  const px = (pt) => (pt * PT2PX).toFixed(2) + 'px';
  const fBody = `${px(12)} ${BODY}`;

  for (const r of rows) {
    const { y, h } = r;
    if (r.type === 'title') {
      drawText(g, '    ' + (brand.company || ''), 0, y, SHEET_W, h, { font: `bold ${px(28)} ${TITLE}`, wrap: false });
      const im = brand.logo && imgs.get(brand.logo);
      if (im) {
        const b = logoBox({ w: im.naturalWidth, h: im.naturalHeight });
        g.drawImage(im, b.x / EMU_PX, y + b.y / EMU_PX, b.w / EMU_PX, b.h / EMU_PX);
      }
    } else if (r.type === 'contact') {
      const runs = [];
      const segs = [];
      if (brand.tel) segs.push(['Tel:', brand.tel]);
      if (brand.web) segs.push(['Web:', ' ' + brand.web]);
      if (brand.email) segs.push(['Email:', ' ' + brand.email]);
      segs.forEach(([l, v], i) => {
        runs.push({ text: l, font: `bold ${px(13)} ${BODY}` });
        runs.push({ text: i < segs.length - 1 ? v + '  ' : v, font: `${px(13)} ${BODY}` });
      });
      drawRich(g, runs, 0, y, SHEET_W, h);
    } else if (r.type === 'header') {
      g.fillStyle = P; g.fillRect(0, y, SHEET_W, h);
      HEADERS.forEach((t, i) => drawText(g, t, COL_X[i], y, COL_PX[i], h, { font: `bold ${px(12)} ${BODY}`, color: '#fff', wrap: i !== 2 }));
      vline(g, 0.5, y, y + h, '#fff');
      for (let i = 1; i < 6; i++) vline(g, COL_X[i], y, y + h, '#fff');
      vline(g, SHEET_W - 0.5, y, y + h, A);
    } else if (r.type === 'item') {
      const it = r.it;
      drawText(g, partText(it), COL_X[0], y, COL_PX[0], h, { font: fBody });
      drawText(g, it.model || '', COL_X[2], y, COL_PX[2], h, { font: fBody });
      const q = num(it.qty);
      if (q !== null) drawText(g, String(q), COL_X[3], y, COL_PX[3], h, { font: fBody, wrap: false });
      drawAccounting(g, num(it.price), COL_X[4], y, COL_PX[4], h, fBody);
      drawAccounting(g, itemAmount(it), COL_X[5], y, COL_PX[5], h, fBody);
      const im = it.image && imgs.get(it.image);
      if (im) {
        const b = pictureBox({ w: im.naturalWidth, h: im.naturalHeight }, COL_X[1] * EMU_PX, y * EMU_PX, h / PT2PX);
        g.drawImage(im, b.x / EMU_PX, b.y / EMU_PX, b.w / EMU_PX, b.h / EMU_PX);
      }
      hline(g, 0, SHEET_W, y + 0.5, P);
    } else if (r.type === 'total') {
      hline(g, 0, SHEET_W, y + 0.5, P);
      drawText(g, quote.totalLabel ?? DEFAULT_TOTAL_LABEL, 0, y, COL_X[5], h, { font: `bold ${px(14)} ${BODY}`, wrap: false });
      const total = (quote.items || []).reduce((s, it) => s + itemAmount(it), 0);
      drawAccounting(g, Math.round(total * 100) / 100, COL_X[5], y, COL_PX[5], h, fBody);
    } else if (r.type === 'term') {
      drawText(g, r.text || '', 0, y, SHEET_W, h, { font: fBody, align: 'left', wrap: false, pad: 3 });
    }
  }

  if (opts.pageBreaks) {
    const breaks = paginate(rows).slice(1).map((p) => rows[p[0]].y);
    g.setLineDash([6, 4]);
    g.strokeStyle = '#4C6EF5'; g.lineWidth = 1.2;
    breaks.forEach((by) => { g.beginPath(); g.moveTo(0, by); g.lineTo(SHEET_W, by); g.stroke(); });
    g.setLineDash([]);
  }
  return { canvas: c, rows, height };
}

// A4 纵向，页边距 10mm，缩放 60%，水平居中（与模板打印设置一致）
const MM_PER_PX = 25.4 / 96;
const PRINT_SCALE = 0.6;
const PAGE_W_MM = 210, PAGE_H_MM = 297, MARGIN_MM = 10;
const PAGE_ROWS_PX = (PAGE_H_MM - 2 * MARGIN_MM) / (MM_PER_PX * PRINT_SCALE);

export function paginate(rows) {
  const pages = []; let cur = []; let used = 0;
  rows.forEach((r, i) => {
    if (cur.length && used + r.h > PAGE_ROWS_PX) { pages.push(cur); cur = []; used = 0; }
    cur.push(i); used += r.h;
  });
  if (cur.length) pages.push(cur);
  return pages;
}

export async function buildPdf(quote, brand) {
  const SCALE = 2.5;
  const { canvas, rows } = await renderSheet(quote, brand, SCALE);
  const pdf = await PDFDocument.create();
  pdf.setTitle(quote.title || quote.no || 'Quotation');
  pdf.setCreator('报价单系统');
  const mm2pt = 72 / 25.4;
  const pageW = PAGE_W_MM * mm2pt, pageH = PAGE_H_MM * mm2pt;
  const pxToPt = MM_PER_PX * PRINT_SCALE * mm2pt;
  const contentW = SHEET_W * pxToPt;

  for (const idx of paginate(rows)) {
    const top = rows[idx[0]].y;
    const last = rows[idx[idx.length - 1]];
    const hPx = last.y + last.h - top;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.ceil(hPx * SCALE);
    const sg = slice.getContext('2d');
    sg.fillStyle = '#fff'; sg.fillRect(0, 0, slice.width, slice.height);
    sg.drawImage(canvas, 0, Math.floor(top * SCALE), canvas.width, slice.height, 0, 0, slice.width, slice.height);
    const jpg = await pdf.embedJpg(dataUrlToBytes(slice.toDataURL('image/jpeg', 0.92)));
    const page = pdf.addPage([pageW, pageH]);
    const h = hPx * pxToPt;
    page.drawImage(jpg, { x: (pageW - contentW) / 2, y: pageH - MARGIN_MM * mm2pt - h, width: contentW, height: h });
  }
  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export { imageInfo };
