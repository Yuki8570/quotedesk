// 「系统方案」版式（来自 500KW+1.8MWh 报价单模板）的常量与默认值
export const SYS = {
  colChars: [17.775, 15.1416666666667, 9.21666666666667, 18.2166666666667, 24.55, 37.0583333333333, 18.9666666666667, 18.9666666666667, 22.9333333333333],
  native: '#1856A1',
  rowH: { r1: 70, r2: 24, r3: 24, r4: 26, info: 25, r8: 25, title: 45, sub: 30, head: 42, item: 110, total: 46, gap: 13.5, termsHead: 28.5, terms: 13.5, r27: 13.5, card: 178 },
  // 页面：A4 纵向，按宽度缩放为 1 页宽
  margins: { left: 0.432638888888889, right: 0.354166666666667, top: 0.629861111111111, bottom: 0.472222222222222 },
};
SYS.colPx = SYS.colChars.map((c) => c * 8);
SYS.colEmu = SYS.colPx.map((p) => Math.round(p * 9525));

export const SYS_DEFAULTS = () => ({
  project: [['Installation Site', ''], ['Peak Sunshine:', ''], ['Estimated Yearly Electricity:', '']],
  contact: { name: '', phone: '', email: 'sales@sunevo.com' },
  titleHL: '', titleRest: 'Energy Storage System', subtitle: '',
  termsL: ['Qutation Validity: 10 Days', 'Package: Standard export package, Composite material box', 'Lead time:15 working days after receiving payment'],
  termsR: ['Sea Port: Shanghai/Ningbo/Shenzhen', 'Payment: 30% TT in advance,70% before shipment.'],
  card: '',
});
export const SYS_TOTAL_LABEL = 'Total EXW Factory Cost';

export const LAYOUTS = {
  classic: { label: '经典版（RMB · 12kW 模板）', currency: 'RMB', symbol: '¥' },
  system: { label: '系统方案版（USD · 500KW 模板）', currency: 'USD', symbol: '$' },
};
export const layoutOf = (q) => (q && q.layout === 'system' ? 'system' : 'classic');

// 解析 **加粗** 标记
export function parseBold(text) {
  const out = [];
  String(text || '').split(/(\*\*[\s\S]+?\*\*)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith('**') && p.endsWith('**') && p.length >= 4) out.push({ text: p.slice(2, -2), bold: true });
    else out.push({ text: p, bold: false });
  });
  return out;
}
export const stripBold = (t) => String(t || '').replace(/\*\*/g, '');

export function colorDist(a, b) {
  const h = (s) => String(s || '').replace('#', '').padEnd(6, '0');
  const x = h(a), y = h(b);
  let d = 0;
  for (let i = 0; i < 3; i++) d += Math.abs(parseInt(x.substr(i * 2, 2), 16) - parseInt(y.substr(i * 2, 2), 16));
  return d;
}
// 品牌主色与模板原色接近时保留模板原色，保证与原模板 1:1
export const sysColor = (brand) => (brand && brand.color && colorDist(brand.color, SYS.native) > 40 ? brand.color : SYS.native);

// 系统方案版里，备注为 Optional / FREE 的行不计入合计
export const sysCounts = (it) => !it.amountNote;
