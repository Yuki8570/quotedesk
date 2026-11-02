// Excel 导出：直接在原始模板 XML 上填数据，保证样式、列宽、打印设置与原模板一致
import JSZip from 'jszip';
import { ASSETS } from './assets.js';
import {
  COL_EMU, EMU_PER_PT, ROW_H, HEADERS, DEFAULT_PRIMARY, DEFAULT_ACCENT,
  DEFAULT_SHEET_NAME, DEFAULT_TOTAL_LABEL, partText, num, itemAmount,
} from './layout.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
const tAttr = (s) => (/^\s|\s$|\n|\s{2}/.test(s) ? ' xml:space="preserve"' : '');
const tEl = (s) => `<t${tAttr(s)}>${esc(s)}</t>`;

// ---------- 图片工具 ----------
export function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function imageInfo(dataUrl) {
  const bytes = dataUrlToBytes(dataUrl);
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const dv = new DataView(bytes.buffer);
    return { ext: 'png', w: dv.getUint32(16), h: dv.getUint32(20), bytes };
  }
  // JPEG：查找 SOF 段
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const m = bytes[i + 1];
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6];
        const w = (bytes[i + 7] << 8) | bytes[i + 8];
        return { ext: 'jpeg', w, h, bytes };
      }
      i += 2 + len;
    }
    return { ext: 'jpeg', w: 1, h: 1, bytes };
  }
  return null;
}

// ---------- 坐标换算 ----------
function makeGrid(rowHeightsPt) {
  const colStarts = [0];
  for (let i = 0; i < 64; i++) colStarts.push(colStarts[i] + (COL_EMU[i] ?? 9 * 8 * 9525));
  const rowStarts = [0];
  rowHeightsPt.forEach((h, i) => rowStarts.push(rowStarts[i] + Math.round(h * EMU_PER_PT)));
  const locate = (starts, v) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= v) i++;
    return [i, Math.round(v - starts[i])];
  };
  return { colStarts, rowStarts, locate };
}

function anchorXml(grid, id, rid, x, y, w, h, descr) {
  const [c1, co1] = grid.locate(grid.colStarts, x);
  const [r1, ro1] = grid.locate(grid.rowStarts, y);
  const [c2, co2] = grid.locate(grid.colStarts, x + w);
  const [r2, ro2] = grid.locate(grid.rowStarts, y + h);
  return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c1}</xdr:col><xdr:colOff>${co1}</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>${ro1}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c2}</xdr:col><xdr:colOff>${co2}</xdr:colOff><xdr:row>${r2}</xdr:row><xdr:rowOff>${ro2}</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="图片 ${id - 1}" descr="${esc(descr || '')}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
}

// 图片在单元格内的位置（与模板一致：Logo 固定位置；产品图在 B 列居中等比缩放）
export function logoBox(info) {
  const aspect = info.w / info.h;
  let h = 318770, w = h * aspect;
  const maxW = 2400000;
  if (w > maxW) { w = maxW; h = w / aspect; }
  const y = h === 318770 ? 133350 : Math.round((ROW_H.title * EMU_PER_PT - h) / 2);
  return { x: 114300, y, w, h };
}
export function pictureBox(info, colX, rowY, rowHpt) {
  const boxW = COL_EMU[1], boxH = rowHpt * EMU_PER_PT;
  const maxW = boxW * 0.84, maxH = boxH * 0.86;
  const s = Math.min(maxW / info.w, maxH / info.h);
  const w = info.w * s, h = info.h * s;
  return { x: colX + (boxW - w) / 2, y: rowY + (boxH - h) / 2, w, h };
}

function sanitizeSheetName(n) {
  const s = String(n || '').replace(/[\[\]:*?/\\]/g, '').slice(0, 31).trim();
  return s || DEFAULT_SHEET_NAME;
}

// ---------- 主函数 ----------
export async function buildXlsx(quote, brand) {
  const zip = await JSZip.loadAsync(ASSETS.template, { base64: true });
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

  const sdStart = sheetXml.indexOf('<sheetData>') + '<sheetData>'.length;
  const sdEnd = sheetXml.indexOf('</sheetData>');
  let head = sheetXml.slice(0, sdStart);
  let tail = sheetXml.slice(sdEnd);
  const tRows = {};
  sheetXml.slice(sdStart, sdEnd).replace(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, (m, r) => { tRows[+r] = m; return ''; });
  const maxTemplateRow = Math.max(...Object.keys(tRows).map(Number));

  const renumber = (xml, r) => xml
    .replace(/^<row r="\d+"/, `<row r="${r}"`)
    .replace(/(<c r="[A-Z]+)\d+"/g, `$1${r}"`);

  // ---- 共享字符串 ----
  const sst = []; const sstIdx = new Map(); let sstCount = 0;
  const addRaw = (key, xml) => {
    sstCount++;
    if (sstIdx.has(key)) return sstIdx.get(key);
    sst.push(xml); sstIdx.set(key, sst.length - 1); return sst.length - 1;
  };
  const addStr = (s) => addRaw('s:' + s, `<si>${tEl(s)}</si>`);

  // 0: 公司名称
  addStr('    ' + (brand.company || ''));
  // 1: 联系方式（富文本：标签加粗）
  const rp = (b) => `<rPr>${b ? '<b/>' : ''}<sz val="13"/><rFont val="Calibri"/><charset val="134"/></rPr>`;
  const segs = [];
  if (brand.tel) segs.push(['Tel:', brand.tel]);
  if (brand.web) segs.push(['Web:', ' ' + brand.web]);
  if (brand.email) segs.push(['Email:', ' ' + brand.email]);
  let contact = '';
  segs.forEach(([label, val], i) => {
    const v = i < segs.length - 1 ? val + '  ' : val;
    contact += i === 0 ? `<r>${tEl(label)}</r>` : `<r>${rp(true)}${tEl(label)}</r>`;
    contact += `<r>${rp(false)}${tEl(v)}</r>`;
  });
  addRaw('contact', contact ? `<si>${contact}</si>` : '<si><t></t></si>');
  // 2-7: 表头
  HEADERS.forEach((h) => addStr(h));

  // ---- 行数据 ----
  const items = quote.items && quote.items.length ? quote.items : [{}];
  const rowsOut = [];
  const rowHeights = [ROW_H.title, ROW_H.contact, ROW_H.header];
  rowsOut.push(tRows[1], tRows[2], tRows[3]);

  const firstItemRow = 4;
  let total = 0;
  items.forEach((it, i) => {
    const r = firstItemRow + i;
    const h = num(it.rowHeight) || ROW_H.item;
    rowHeights.push(h);
    const a = partText(it);
    const q = num(it.qty), p = num(it.price);
    const amt = itemAmount(it);
    total += amt;
    const strCell = (col, s, st) => (s ? `<c r="${col}${r}" s="${st}" t="s"><v>${addStr(s)}</v></c>` : `<c r="${col}${r}" s="${st}"/>`);
    const numCell = (col, v, st) => (v === null ? `<c r="${col}${r}" s="${st}"/>` : `<c r="${col}${r}" s="${st}"><v>${v}</v></c>`);
    rowsOut.push(
      `<row r="${r}" s="3" customFormat="1" ht="${h}" customHeight="1" spans="1:12">`
      + strCell('A', a, 15)
      + `<c r="B${r}" s="16"/>`
      + strCell('C', (it.model || '').replace(/\*\*/g, ''), 17)
      + numCell('D', q, 16)
      + numCell('E', p, 18)
      + `<c r="F${r}" s="18"><f>D${r}*E${r}</f><v>${amt}</v></c>`
      + `<c r="L${r}" s="25"/></row>`,
    );
  });
  const lastItemRow = firstItemRow + items.length - 1;

  // 合计行（富文本：中文/全角字符使用宋体，与模板一致）
  const totalRow = lastItemRow + 1;
  const label = quote.totalLabel ?? DEFAULT_TOTAL_LABEL;
  const runs = [];
  for (const ch of label) {
    const cjk = /[　-〿＀-￯一-鿿]/.test(ch);
    const font = cjk ? '宋体' : 'Calibri';
    if (runs.length && runs[runs.length - 1].font === font) runs[runs.length - 1].text += ch;
    else runs.push({ font, text: ch });
  }
  const totalSi = runs.length
    ? `<si>${runs.map((r) => `<r><rPr><b/><sz val="14"/><rFont val="${r.font}"/><charset val="134"/></rPr>${tEl(r.text)}</r>`).join('')}</si>`
    : '<si><t></t></si>';
  const totalIdx = addRaw('total:' + label, totalSi);
  total = Math.round(total * 100) / 100;
  rowsOut.push(
    `<row r="${totalRow}" ht="30.75" customHeight="1" spans="1:6"><c r="A${totalRow}" s="19" t="s"><v>${totalIdx}</v></c><c r="B${totalRow}" s="19"/><c r="C${totalRow}" s="19"/><c r="D${totalRow}" s="19"/><c r="E${totalRow}" s="19"/><c r="F${totalRow}" s="20"><f>SUM(F${firstItemRow}:F${lastItemRow})</f><v>${total}</v></c></row>`,
  );
  rowHeights.push(ROW_H.total);

  // 条款行（沿用模板第 9-13 行的格式）
  const terms = quote.terms || [];
  const merges = ['A1:F1', 'A2:F2', `A${totalRow}:E${totalRow}`];
  terms.forEach((t, j) => {
    const r = totalRow + 1 + j;
    let xml = renumber(tRows[j < 2 ? 9 + j : Math.min(11 + (j - 2), 13)], r);
    xml = t
      ? xml.replace(/<v>\d+<\/v>/, `<v>${addStr(t)}</v>`)
      : xml.replace(/ t="s"><v>\d+<\/v><\/c>/, '/>');
    rowsOut.push(xml);
    rowHeights.push(ROW_H.term);
    merges.push(`A${r}:F${r}`);
  });
  const lastTermRow = totalRow + terms.length;

  // 模板尾部的空行（第 14 行起）整体平移
  const shift = lastTermRow - 13;
  for (let r = 14; r <= maxTemplateRow; r++) {
    if (tRows[r]) rowsOut.push(renumber(tRows[r], r + shift));
  }
  merges.push(`A${14 + shift}:F${14 + shift}`);
  const lastRow = maxTemplateRow + shift;

  head = head.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:XFD${lastRow}"/>`);
  tail = tail.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`);
  zip.file('xl/worksheets/sheet1.xml', head + rowsOut.join('') + tail);

  // ---- sharedStrings ----
  zip.file('xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sstCount}" uniqueCount="${sst.length}">${sst.join('')}</sst>`);

  // ---- 工作表名 + 打印区域 ----
  const sheetName = sanitizeSheetName(quote.sheetName);
  const qName = `'${sheetName.replace(/'/g, "''")}'`;
  let wb = await zip.file('xl/workbook.xml').async('string');
  wb = wb.replace(/<sheet name="[^"]*"/, `<sheet name="${esc(sheetName)}"`)
    .replace(/(<definedName name="_xlnm.Print_Area"[^>]*>)[^<]*(<\/definedName>)/, (m, a, b) => `${a}${esc(qName)}!$A$1:$F$${lastTermRow}${b}`);
  zip.file('xl/workbook.xml', wb);
  const appXml = await zip.file('docProps/app.xml').async('string');
  zip.file('docProps/app.xml', appXml.replace(/(<vt:lpstr>)[^<]*(<\/vt:lpstr>)(?![\s\S]*<vt:lpstr>)/, (m, a, b) => `${a}${esc(sheetName)}${b}`));

  // ---- 主题色 ----
  const hex = (c, d) => 'FF' + String(c || d).replace('#', '').toUpperCase();
  let styles = await zip.file('xl/styles.xml').async('string');
  styles = styles.split('FF1651A3').join(hex(brand.color, DEFAULT_PRIMARY))
    .split('FF00B050').join(hex(brand.accent, DEFAULT_ACCENT));
  zip.file('xl/styles.xml', styles);

  // ---- 图片 ----
  const grid = makeGrid(rowHeights);
  const anchors = []; const rels = []; const mediaByUrl = new Map();
  let picId = 2;
  const addMedia = (url) => {
    if (mediaByUrl.has(url)) return mediaByUrl.get(url);
    const info = imageInfo(url);
    if (!info) return null;
    const n = mediaByUrl.size + 1;
    const rid = 'rId' + n;
    zip.file(`xl/media/image${n}.${info.ext}`, info.bytes);
    rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.${info.ext}"/>`);
    const rec = { rid, info };
    mediaByUrl.set(url, rec);
    return rec;
  };
  if (brand.logo) {
    const m = addMedia(brand.logo);
    if (m) {
      const b = logoBox(m.info);
      anchors.push(anchorXml(grid, picId++, m.rid, b.x, b.y, b.w, b.h, brand.name || 'Logo'));
    }
  }
  items.forEach((it, i) => {
    if (!it.image) return;
    const m = addMedia(it.image);
    if (!m) return;
    const r = 3 + i; // 0-based 行号
    const b = pictureBox(m.info, grid.colStarts[1], grid.rowStarts[r], rowHeights[r]);
    anchors.push(anchorXml(grid, picId++, m.rid, b.x, b.y, b.w, b.h, it.model || ''));
  });
  zip.file('xl/drawings/drawing1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join('')}</xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);

  return zip.generateAsync({
    type: typeof window === 'undefined' ? 'uint8array' : 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
