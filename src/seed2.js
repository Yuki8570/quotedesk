// 第二批种子数据：来自 500KW+1.8MWh 储能方案和 10KW 混合系统两份报价单
import { ASSETS2 } from './assets2.js';
import { SYS_DEFAULTS } from './layout2.js';

const P = (id, o) => ({ id: 'p2-' + id, currency: 'USD', ...o, createdAt: 1767225600000, updatedAt: 1767225600000 });

export const PRODUCTS_V2 = [
  P('mega0500ts', { category: '储能变流器', image: ASSETS2.a1, price: 23250, warranty: '5 Years',
    name: 'MEGA0500TS 500KW Energy Storage Bidirectional Converter                                      ',
    nameBold: '(with isolation transformer and automatic switching                                     between grid and off grid)',
    model: 'Model: MEGA0500TS\nOutput Power: 500KW\nOutput Voltage: 380Vac \nBattery Voltage: 500-850Vdc' }),
  P('sunark-1mwh', { category: '储能电池', image: ASSETS2.a2, price: 15830, warranty: '10 Years',
    name: 'SunArk 1MWh High Voltage\nLithium Battery Bank                          5*209kWh=1.045MWh',
    model: '665.6V 314Ah=209kWh\n**Including Battery Mounting Rack and Connection Cables **                                                         13*51.2V 314Ah/Each Battery Cluster' }),
  P('hv-control-box', { category: '储能电池', image: ASSETS2.a3, price: 626, warranty: '5 Years',
    name: 'Lithium Battery High Voltage Control Box(Single String)',
    model: 'Lithium Battery High Voltage Control Box(Control and monitoring single battery module)' }),
  P('confluence-cabinet', { category: '配件', image: ASSETS2.a4, price: 4450, warranty: '5 Years',
    name: 'Battery Confluence Cabinet                                                                    ', nameBold: 'With UPS', model: '1500V 800A' }),
  P('ems', { category: '能量管理', image: ASSETS2.a5, price: 4330, warranty: '3 Years', name: 'EMS', model: 'Energy Management System' }),
  P('container-40ft', { category: '储能集装箱', image: ASSETS2.a6, price: 27758, warranty: '10 Years',
    name: 'Outdoor Battery Energy Storage Container',
    model: '40ft Customized Container\nIncluding firefighting, lighting, decoration, air conditioning, etc' }),
  P('pv-650w', { category: '光伏组件', image: ASSETS2.b1, price: 75, warranty: '25 Years',
    name: 'SunEvo 650W PV Module\nMono N Type Bifacial Dual Glass                       Half Cell Tech',
    model: 'Model: **SE6R-66HBD-650M**\nPower: **650W**\nSize:**2382*1134*30 mm**\n8pcs per string *2strings ' }),
  P('deye-10k', { category: '逆变器', image: ASSETS2.b2, price: 1099, warranty: '10 Years',
    name: 'Deye SUN-10K-SG06LP1-EU-CM3                   Single Phase 10kW Hybrid Inverter                                                         ',
    nameBold: 'With Wifi Module And DC Switch',
    model: 'Output Power:10KW                          MPPT Voltage:150-425Vdc\nBattery Voltage:40-60V                             Rated AC Output Voltage:220/230' }),
  P('wallark-10240', { category: '储能电池', image: ASSETS2.b3, price: 1050, warranty: '10 Years',
    name: 'SunArk 10.24kWh Lithium Battery Pack',
    model: 'Model: WallArk-10240**                                                                                                          **51.2V 200Ah-10.24 kWh                                                   DOD: recommend 80% @ 0.5C        **20.48kWh in total for 2pcs**' }),
  P('pv-cable-4mm', { category: '配件', image: ASSETS2.b4, price: 0.9, warranty: '10 Years', name: 'Single-core PV Cable', model: '4mm²' }),
  P('mc4', { category: '配件', image: ASSETS2.b5, price: 1, warranty: '5 Years', name: 'MC4 Connector', model: 'Rated current: 30A                          \nRated voltage: 1000VDC' }),
  P('roof-mount', { category: '支架', image: ASSETS2.b6, price: 356, warranty: '10 Years',
    name: 'Standard Pitched Metal Roof                            Mounting Structure', model: 'Material: Aluminium Alloy' }),
  P('safe-package', { category: '配件', image: ASSETS2.b7, price: 120, warranty: '', name: 'SunEvo Safe Package', model: 'Better Protection\nSimpilified Logistics' }),
];

const item = (pid, qty, extra = {}) => {
  const p = PRODUCTS_V2.find((x) => x.id === 'p2-' + pid);
  return { id: 'i2-' + pid + '-' + Math.random().toString(36).slice(2, 7), productId: p.id, name: p.name, nameBold: p.nameBold || '', warranty: p.warranty, model: p.model, price: p.price, image: p.image, qty, rowHeight: 110, amountNote: '', ...extra };
};

const ESS = () => ({
  layout: 'system', brandId: null, totalLabel: 'Total EXW Factory Cost', sheetName: 'Sheet1',
  items: [item('mega0500ts', 1, { rowHeight: 152 }), item('sunark-1mwh', 9, { rowHeight: 120 }), item('hv-control-box', 9, { rowHeight: 126 }),
    item('confluence-cabinet', 2), item('ems', 1, { amountNote: 'Optional' }), item('container-40ft', 1, { amountNote: 'Optional' })],
  sys: { ...SYS_DEFAULTS(), project: [['Installation Site', 'Spain'], ['Peak Sunshine:', '3.08-4.91H'], ['Estimated Yearly Electricity:', 'N/A']],
    titleHL: '500KW+1.8MWh', titleRest: 'Energy Storage System', subtitle: '[**500kW** Three Phase Inverter] + [**1.881MWh** Battery Bank]',
    termsL: ['Qutation Validity: 10 Days from 26th, January, 2026', 'Package: Standard export package, Composite material box', 'Lead time:15 working days after receiving payment'],
    termsR: ['Sea Port: Shanghai/Ningbo/Shenzhen', 'Payment: 30% TT in advance,70% before shipment.'] },
});
const HYB = () => ({
  layout: 'system', brandId: null, totalLabel: 'Total EXW Factory Amount', sheetName: 'Sheet1',
  items: [item('pv-650w', 16), item('deye-10k', 1, { rowHeight: 140 }), item('wallark-10240', 2), item('pv-cable-4mm', 200, { rowHeight: 88 }),
    item('mc4', 10, { rowHeight: 88, amountNote: 'FREE' }), item('roof-mount', 1, { rowHeight: 88 }), item('safe-package', 1, { rowHeight: 88 })],
  sys: { ...SYS_DEFAULTS(), project: [['Installation Site', 'N/A'], ['Peak Sunshine:', '4-6h'], ['Estimated Daily Electricity:', '40-60kWh']],
    titleHL: '10KW', titleRest: 'Single Phase Hybrid System', subtitle: ' [**10.40kW** Solar Panel] + [**10kW** Single Phase Inverter] + [**20.48kWh** Battery]',
    termsL: ['Qutation Validity: 10 Days from the date of quotation, 2026', 'Package: Standard export package, Composite material box', 'Lead time:15 working days after receiving payment'],
    termsR: ['Sea Port: Shanghai/Ningbo', 'Payment: 100% in advance.'] },
});

export function seedV2(brandId) {
  const now = Date.now();
  const ess = ESS(), hyb = HYB();
  return {
    products: PRODUCTS_V2,
    templates: [
      { id: 't2-ess-500kw', name: '500KW + 1.8MWh 储能系统（系统方案版）', desc: 'PCS + 储能电池 + 高压控制盒 + 汇流柜 + EMS + 集装箱', ...ess, brandId, createdAt: now, updatedAt: now },
      { id: 't2-hybrid-10kw', name: '10KW 单相混合系统（系统方案版）', desc: '光伏组件 + Deye 逆变器 + 锂电池 + 线缆/MC4/支架', ...hyb, brandId, createdAt: now, updatedAt: now },
    ],
    quotes: [
      { id: 'q2-ess-500kw', no: 'Q20260126-001', title: '500KW_PCS1.8MWh_Battery_SOLUTION', customer: 'Spain Project', date: '2026-01-26', status: 'sent', ...ESS(), brandId, createdAt: now, updatedAt: now },
      { id: 'q2-hybrid-10kw', no: 'Q20260126-002', title: 'SUNEVO-SE10KW-HY', customer: '', date: '', status: 'draft', ...HYB(), brandId, createdAt: now, updatedAt: now },
    ],
  };
}
