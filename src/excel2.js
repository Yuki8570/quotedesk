// 「系统方案」版式 Excel 导出：在原始 500KW 模板 XML 上填数据
import JSZip from 'jszip';
import { ASSETS2 } from './assets2.js';
import { imageInfo } from './excel.js';
import { SYS, SYS_DEFAULTS, SYS_TOTAL_LABEL, parseBold, sysColor } from './layout2.js';
import { num } from './layout.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
const tEl = (s) => `<t${/^\s|\s$|\n|\s{2}/.test(s) ? ' xml:space="preserve"' : ''}>${esc(s)}</t>`;
const C = (c) => 'FF' + c.replace('#', '').toUpperCase();

const RP = {
  name: '<rPr><sz val="12"/><color theme="2" tint="-0.749992370372631"/><rFont val="Poppins"/><charset val="134"/></rPr>',
  nameB: '<rPr><b/><sz val="12"/><color theme="2" tint="-0.749992370372631"/><rFont val="Poppins"/><charset val="134"/></rPr>',
  warranty: (c) => `<rPr><sz val="12"/><color rgb="${c}"/><rFont val="Poppins SemiBold"/><charset val="134"/></rPr>`,
  titleRest: '<rPr><sz val="28"/><color theme="1"/><rFont val="Poppins ExtraBold"/><charset val="134"/></rPr>',
  sub: '<rPr><sz val="16"/><color theme="1"/><rFont val="Poppins Light"/><charset val="134"/></rPr>',
  subB: '<rPr><b/><sz val="16"/><color theme="1"/><rFont val="Poppins SemiBold"/><charset val="134"/></rPr>',
};
const HEAD_RICH = (word, unit) => `<si><r><rPr><sz val="14"/><color theme="0"/><rFont val="Poppins SemiBold"/><charset val="134"/></rPr><t xml:space="preserve">${word} </t></r><r><rPr><sz val="8"/><color theme="0"/><rFont val="Poppins SemiBold"/><charset val="134"/></rPr><t>(${unit})</t></r></si>`;

function cellsOf(rowXml) {
  const cells = [];
  rowXml.replace(/<c r="([A-Z]+)\d+"(?: s="(\d+)")?(?: t="(\w+)")?(?:\/>|>([\s\S]*?)<\/c>)/g, (m, col, s, t, inner) => { cells.push({ col, s, t, inner }); return ''; });
  return cells;
}
function rowXml(r, attrs, cells) {
  const body = cells.map((c) => {
    const s = c.s ? ` s="${c.s}"` : '';
    if (c.str !== undefined) return c.str === null ? `<c r="${c.col}${r}"${s}/>` : `<c r="${c.col}${r}"${s} t="s"><v>${c.str}</v></c>`;
    if (c.f !== undefined) return `<c r="${c.col}${r}"${s}${c.t ? ` t="${c.t}"` : ''}><f>${esc(c.f)}</f><v>${esc(c.v)}</v></c>`;
    if (c.n !== undefined) return c.n === null ? `<c r="${c.col}${r}"${s}/>` : `<c r="${c.col}${r}"${s}><v>${c.n}</v></c>`;
    return `<c r="${c.col}${r}"${s}/>`;
  }).join('');
  return `<row r="${r}"${attrs}>${body}</row>`;
}
const rowAttrs = (xml) => /^<row r="\d+"([^>]*)>/.exec(xml)[1];

function grid(rowHeights) {
  const colStarts = [0];
  for (let i = 0; i < 30; i++) colStarts.push(colStarts[i] + (SYS.colEmu[i] ?? Math.round(8.883 * 8 * 9525)));
  const rowStarts = [0];
  rowHeights.forEach((h, i) => rowStarts.push(rowStarts[i] + Math.round(h * 12700)));
  const loc = (starts, v) => { let i = 0; while (i + 1 < starts.length && starts[i + 1] <= v) i++; return [i, Math.round(v - starts[i])]; };
  return { colStarts, rowStarts, loc };
}
function anchor(g, id, rid, x, y, w, h) {
  const [c1, co1] = g.loc(g.colStarts, x), [r1, ro1] = g.loc(g.rowStarts, y);
  const [c2, co2] = g.loc(g.colStarts, x + w), [r2, ro2] = g.loc(g.rowStarts, y + h);
  return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c1}</xdr:col><xdr:colOff>${co1}</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>${ro1}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c2}</xdr:col><xdr:colOff>${co2}</xdr:colOff><xdr:row>${r2}</xdr:row><xdr:rowOff>${ro2}</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="图片 ${id - 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
}

// 图片位置（预览和导出共用，单位 EMU）
export function sysLogoBox(info) {
  const maxW = 3994150, maxH = 614045;
  const s = Math.min(maxW / info.w, maxH / info.h);
  return { x: 0, y: 0, w: info.w * s, h: info.h * s };
}
export function sysPicBox(info, colX, rowY, rowHpt) {
  const bw = SYS.colEmu[4], bh = rowHpt * 12700;
  const s = Math.min((bw * 0.9) / info.w, (bh * 0.84) / info.h);
  const w = info.w * s, h = info.h * s;
  return { x: colX + (bw - w) / 2, y: rowY + (bh - h) / 2, w, h };
}
export const sysCardBox = (info, rowY) => {
  const w = 13896340, h = (w * info.h) / info.w;
  return { x: 21590, y: rowY + 21590, w, h };
};

export async function buildXlsx2(quote, brand) {
  const S = { ...SYS_DEFAULTS(), ...(quote.sys || {}) };
  const color = C(sysColor(brand));
  const zip = await JSZip.loadAsync(ASSETS2.template2, { base64: true });
  const sheet = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const a = sheet.indexOf('<sheetData>') + 11, b = sheet.indexOf('</sheetData>');
  let head = sheet.slice(0, a), tail = sheet.slice(b);
  const T = {};
  sheet.slice(a, b).replace(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, (m, r) => { T[+r] = m; return ''; });

  // 共享字符串
  const sst = []; const idx = new Map(); let count = 0;
  const raw = (key, xml) => { count++; if (idx.has(key)) return idx.get(key); sst.push(xml); idx.set(key, sst.length - 1); return sst.length - 1; };
  const str = (s) => (s === '' || s == null ? null : raw('s:' + s, `<si>${tEl(String(s))}</si>`));
  const rich = (key, runs) => raw(key, `<si>${runs.map(([rp, t]) => `<r>${rp}${tEl(t)}</r>`).join('')}</si>`);

  const out = []; const heights = [];
  const put = (r, xml, h) => { out.push(xml); heights[r - 1] = h; };
  const fill = (r, map, hDefault) => {
    const xml = T[r];
    const cells = cellsOf(xml).map((c) => (c.col in map ? { col: c.col, s: c.s, ...map[c.col] } : { col: c.col, s: c.s }));
    const h = +(/ht="([\d.]+)"/.exec(xml)?.[1] || hDefault);
    return { xml: rowXml(r, rowAttrs(xml), cells), h };
  };

  // 1–11 行：抬头、日期、项目信息、联系人、标题、表头
  let x;
  x = fill(1, { E: { str: str(brand.company || '') } }); put(1, x.xml, x.h);
  x = fill(2, { A: { str: str(quote.date ? 'Date: ' + quote.date.replace(/-/g, '/') : '') } }); put(2, x.xml, x.h);
  x = fill(3, {}); put(3, x.xml, x.h);
  x = fill(4, { A: { str: str('PROJECT INFORMATION') }, F: { str: str('CONCT US') } }); put(4, x.xml, x.h);
  const contact = [['Name', S.contact.name], ['Phone/WhatsApp/Wechat:', S.contact.phone], ['Email:', S.contact.email]];
  for (let i = 0; i < 3; i++) {
    const [pl, pv] = S.project[i] || ['', ''];
    x = fill(5 + i, { A: { str: str(pl) }, C: { str: str(pv) }, F: { str: str(contact[i][0]) }, H: { str: str(contact[i][1]) } });
    put(5 + i, x.xml, x.h);
  }
  x = fill(8, {}); put(8, x.xml, x.h);
  const titleRuns = [];
  if (S.titleHL) titleRuns.push(['', S.titleHL]);
  if (S.titleRest) titleRuns.push([RP.titleRest, (S.titleHL ? ' ' : '') + S.titleRest]);
  x = fill(9, { A: { str: titleRuns.length ? rich('title', titleRuns) : null } }); put(9, x.xml, x.h);
  const subRuns = parseBold(S.subtitle).map((p) => [p.bold ? RP.subB : RP.sub, p.text]);
  x = fill(10, { A: { str: subRuns.length ? rich('sub', subRuns) : null } }); put(10, x.xml, x.h);
  x = fill(11, {
    A: { str: str('Item #') }, B: { str: str('Parts & Warranty') }, E: { str: str('Image') }, F: { str: str('Specification') },
    G: { str: raw('hq', HEAD_RICH('Quantity', 'PCS')) }, H: { str: raw('hu', HEAD_RICH('Unit price', 'USD')) }, I: { str: raw('ha', HEAD_RICH('Amount', 'USD')) },
  }); put(11, x.xml, x.h);

  // 明细行
  const items = quote.items && quote.items.length ? quote.items : [{}];
  const first = 12;
  let total = 0;
  items.forEach((it, i) => {
    const r = first + i;
    const st = i === 0 ? { A: 36, B: 37, C: 38, D: 38, E: 39, F: 37, G: 37, H: 40, I: 41 } : { A: 36, B: 42, C: 43, D: 43, E: 44, F: 42, G: 42, H: 41, I: 41 };
    const runs = [];
    parseBold(it.name).forEach((p) => p.text && runs.push([p.bold ? RP.nameB : RP.name, p.text]));
    if (it.nameBold) runs.push([RP.nameB, it.nameBold]);
    if (it.warranty) runs.push([RP.name, '\n'], [RP.warranty(color), `[${it.warranty}]`]);
    const specRuns = parseBold(it.model).filter((p) => p.text).map((p) => [p.bold ? RP.nameB : RP.name, p.text]);
    const q = num(it.qty), p = num(it.price);
    const amt = q !== null && p !== null ? Math.round(q * p * 100) / 100 : 0;
    let I;
    if (it.amountNote) I = { s: 46, str: str(it.amountNote) };
    else { I = { s: st.I, f: `G${r}*H${r}`, v: amt }; total += amt; }
    const cells = [
      { col: 'A', s: st.A, n: i + 1 },
      { col: 'B', s: st.B, str: runs.length ? rich('n' + i, runs) : null },
      { col: 'C', s: st.C }, { col: 'D', s: st.D }, { col: 'E', s: st.E },
      { col: 'F', s: st.F, str: specRuns.length ? rich('m' + i, specRuns) : null },
      { col: 'G', s: st.G, n: q }, { col: 'H', s: st.H, n: p }, { col: 'I', ...I },
    ];
    const h = num(it.rowHeight) || SYS.rowH.item;
    put(r, rowXml(r, ` s="1" customFormat="1" ht="${h}" customHeight="1" spans="1:15"`, cells), h);
  });
  const last = first + items.length - 1;
  const shift = last - 17;

  // 合计、条款、名片
  const tr = 18 + shift;
  total = Math.round(total * 100) / 100;
  put(tr, rowXml(tr, rowAttrs(T[18]), [...'ABCDEFGH'].map((c, i) => ({ col: c, s: 47, ...(i === 0 ? { str: str(quote.totalLabel || SYS_TOTAL_LABEL) } : {}) })).concat([{ col: 'I', s: 48, f: `SUM(I${first}:I${last})`, v: total }])), 46);
  heights[19 + shift - 1] = SYS.rowH.gap;
  const bullet = (list) => (list || []).filter((t) => t.trim()).map((t) => '• ' + t).join('\n');
  const rows2 = { 20: {}, 21: { A: { str: str(bullet(S.termsL)) }, F: { str: str(bullet(S.termsR)) } } };
  for (let r = 20; r <= 27; r++) {
    const nr = r + shift;
    const xml = T[r];
    const map = r === 20 ? { A: { str: str('TERMS OF SALE AND OTHER COMMENTS') } } : r === 27 ? { A: { str: str(' ') } } : rows2[r] || {};
    const cells = cellsOf(xml).map((c) => (c.col in map ? { col: c.col, s: c.s, ...map[c.col] } : { col: c.col, s: c.s }));
    put(nr, rowXml(nr, rowAttrs(xml), cells), +(/ht="([\d.]+)"/.exec(xml)?.[1] || 13.5));
  }
  const cardRow = 28 + shift;
  const cardInfo = S.card ? imageInfo(S.card) : null;
  const cardId = 'ID_' + 'C0FFEE0123456789ABCDEF0123456789'.slice(0, 32);
  if (cardInfo) {
    put(cardRow, `<row r="${cardRow}" s="1" customFormat="1" ht="178" customHeight="1" spans="1:10"><c r="A${cardRow}" s="1" t="str"><f>_xlfn.DISPIMG(&quot;${cardId}&quot;,1)</f><v>=DISPIMG(&quot;${cardId}&quot;,1)</v></c></row>`, 178);
  }
  const lastRow = cardInfo ? cardRow : 27 + shift;

  const merges = ['A1:D1', 'E1:I1', 'A2:B2', 'C2:D2', 'H2:I2', 'A3:I3', 'A4:E4', 'F4:I4'];
  for (let r = 5; r <= 7; r++) merges.push(`A${r}:B${r}`, `C${r}:D${r}`, `F${r}:G${r}`, `H${r}:I${r}`);
  merges.push('A8:I8', 'A9:I9', 'A10:I10', 'B11:D11');
  for (let r = first; r <= last; r++) merges.push(`B${r}:D${r}`);
  merges.push(`A${tr}:H${tr}`, `A${20 + shift}:I${20 + shift}`);
  if (cardInfo) merges.push(`A${cardRow}:I${cardRow}`);
  merges.push(`A${21 + shift}:E${26 + shift}`, `F${21 + shift}:I${26 + shift}`);

  head = head.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:O${lastRow}"/>`);
  tail = tail.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`);
  const email = S.contact.email || '';
  if (email) tail = tail.replace(/<hyperlink ref="H7"[^>]*\/>/, `<hyperlink ref="H7" r:id="rId2" display="${esc(email)}" tooltip="mailto:${esc(email)}"/>`);
  else tail = tail.replace(/<hyperlinks>[\s\S]*?<\/hyperlinks>/, '');
  zip.file('xl/worksheets/sheet1.xml', head + out.join('') + tail);

  let srels = await zip.file('xl/worksheets/_rels/sheet1.xml.rels').async('string');
  srels = email ? srels.replace(/Target="mailto:[^"]*"/, `Target="mailto:${esc(email)}"`) : srels.replace(/<Relationship Id="rId2"[^>]*\/>/, '');
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', srels);

  zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${sst.length}">${sst.join('')}</sst>`);

  let wb = await zip.file('xl/workbook.xml').async('string');
  wb = wb.replace(/(<definedName name="_xlnm.Print_Area"[^>]*>)[^<]*(<\/definedName>)/, (m, p, q) => `${p}Sheet1!$A$1:$I$${lastRow}${q}`);
  zip.file('xl/workbook.xml', wb);

  let styles = await zip.file('xl/styles.xml').async('string');
  if (color !== 'FF1856A1') styles = styles.split('FF1856A1').join(color);
  zip.file('xl/styles.xml', styles);

  // 图片
  const g = grid(heights.map((h) => h || 13.5));
  const anchors = []; const rels = []; const media = new Map(); let pid = 2;
  const addMedia = (url) => {
    if (media.has(url)) return media.get(url);
    const info = imageInfo(url); if (!info) return null;
    const n = media.size + 1;
    zip.file(`xl/media/image${n}.${info.ext}`, info.bytes);
    const rec = { rid: 'rId' + n, info, n };
    rels.push(`<Relationship Id="${rec.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.${info.ext}"/>`);
    media.set(url, rec); return rec;
  };
  if (brand.logo) { const m = addMedia(brand.logo); if (m) { const bx = sysLogoBox(m.info); anchors.push(anchor(g, pid++, m.rid, bx.x, bx.y, bx.w, bx.h)); } }
  items.forEach((it, i) => {
    if (!it.image) return;
    const m = addMedia(it.image); if (!m) return;
    const r0 = first - 1 + i;
    const bx = sysPicBox(m.info, g.colStarts[4], g.rowStarts[r0], heights[r0]);
    anchors.push(anchor(g, pid++, m.rid, bx.x, bx.y, bx.w, bx.h));
  });
  zip.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join('')}</xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);

  // 底部名片（WPS 单元格图片，与原模板相同的 DISPIMG 方式）
  let ct = await zip.file('[Content_Types].xml').async('string');
  let wrels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  if (cardInfo) {
    const n = media.size + 1;
    zip.file(`xl/media/image${n}.${cardInfo.ext}`, cardInfo.bytes);
    const bx = sysCardBox(cardInfo, 0);
    zip.file('xl/cellimages.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<etc:cellImages xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:etc="http://www.wps.cn/officeDocument/2017/etCustomData"><etc:cellImage><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="${cardId}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="${bx.x}" y="${bx.y}"/><a:ext cx="${Math.round(bx.w)}" cy="${Math.round(bx.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic></etc:cellImage></etc:cellImages>`);
    zip.file('xl/_rels/cellimages.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${n}.${cardInfo.ext}"/></Relationships>`);
  } else {
    ct = ct.replace(/<Override PartName="\/xl\/cellimages.xml"[^>]*\/>/, '');
    wrels = wrels.replace(/<Relationship Id="rId4"[^>]*cellImage[^>]*\/>/, '');
  }
  zip.file('[Content_Types].xml', ct);
  zip.file('xl/_rels/workbook.xml.rels', wrels);

  return zip.generateAsync({ type: typeof window === 'undefined' ? 'uint8array' : 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
