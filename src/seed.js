import { ASSETS } from './assets.js';
import { ASSETS2 } from './assets2.js';
import { DEFAULT_TERMS, DEFAULT_TOTAL_LABEL, DEFAULT_PRIMARY, DEFAULT_ACCENT } from './layout.js';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 生成示例品牌 LOGO（仅演示用）
function demoLogo(text, color) {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 900; c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath(); g.arc(90, 90, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(98, 40); g.lineTo(60, 100); g.lineTo(88, 100); g.lineTo(80, 142); g.lineTo(122, 78); g.lineTo(94, 78); g.closePath(); g.fill();
  g.fillStyle = color;
  g.font = 'bold 104px Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(text, 185, 96);
  return c.toDataURL('image/png');
}

export function seedData() {
  const now = Date.now();
  const products = [
    { id: uid(), name: 'High Efficiency\nPV Module', warranty: '30 Years Power Warranty', model: '550W', price: 408, category: '光伏组件', image: ASSETS.pv },
    { id: uid(), name: '10kW\nHybrid Solar Inverter', warranty: '', model: 'SPI-10K-SP', price: 6842, category: '逆变器', image: ASSETS.inv },
    { id: uid(), name: 'Lead-Acid battery\nDeep Cycle GEL Battery', warranty: '2 Years', model: '12V 200Ah', price: 1140, category: '储能电池', image: ASSETS.bat },
    { id: uid(), name: 'Battery rack', warranty: '', model: '8pcs rack', price: 520, category: '配件', image: ASSETS.rack },
  ].map((p) => ({ ...p, createdAt: now, updatedAt: now }));

  const brands = [
    { id: uid(), name: 'SunEvo', company: 'SunEvo Solar Co., Ltd.', tel: '+86 181 3367 7933', web: 'www.sunevo.com', email: '', color: DEFAULT_PRIMARY, accent: DEFAULT_ACCENT, logo: ASSETS.logo, isDefault: true, sysCompany: 'SunEvo Solar Co., LTD.', sysLogo: ASSETS2.sysLogo },
    { id: uid(), name: '示例品牌 Voltera', company: 'Voltera Energy Co., Ltd.', tel: '+86 21 5555 0188', web: 'www.voltera-demo.com', email: 'sales@voltera-demo.com', color: '#0E7C66', accent: '#F2A900', logo: demoLogo('VOLTERA', '#0E7C66'), isDefault: false },
  ];

  const items = [[0, 24], [1, 1], [2, 8], [3, 1]].map(([i, qty]) => {
    const p = products[i];
    return { id: uid(), productId: p.id, name: p.name, warranty: p.warranty, model: p.model, price: p.price, image: p.image, qty, rowHeight: [125, 131, 123, 151][i] };
  });

  const templates = [{
    id: uid(), name: '12kW 离网储能系统（标准）', desc: '光伏组件 + 混合逆变器 + 铅酸电池 + 电池架', brandId: brands[0].id,
    items: items.map((it) => ({ ...it, id: uid() })), totalLabel: DEFAULT_TOTAL_LABEL, terms: [...DEFAULT_TERMS], sheetName: '10',
    createdAt: now, updatedAt: now,
  }];

  const quotes = [{
    id: uid(), no: 'Q20250214-001', title: '25.2.14_12kW_solar_system', customer: 'Demo Customer', date: '2025-02-14', status: 'sent',
    brandId: brands[0].id, items, totalLabel: DEFAULT_TOTAL_LABEL, terms: [...DEFAULT_TERMS], sheetName: '10',
    createdAt: now, updatedAt: now,
  }];
  return { products, brands, templates, quotes };
}
