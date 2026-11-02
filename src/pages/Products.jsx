import { useMemo, useState } from 'react';
import { LuPlus, LuPencil, LuTrash2, LuPackage, LuCopy } from 'react-icons/lu';
import { useStore } from '../store.jsx';
import { Modal, ImageBox, SearchInput, Field, Empty, Menu, Confirm } from '../ui.jsx';
import { fmtMoney, fmtDate, firstLine } from '../util.js';

export function ProductForm({ initial, onClose, onSaved, title = '产品信息' }) {
  const { save, data, toast } = useStore();
  const [p, setP] = useState({ name: '', nameBold: '', warranty: '', model: '', price: '', currency: 'RMB', category: '', image: '', ...initial });
  const set = (k) => (e) => setP({ ...p, [k]: e?.target ? e.target.value : e });
  const cats = [...new Set(data.products.map((x) => x.category).filter(Boolean))];
  const submit = async () => {
    if (!p.name.trim() && !p.model.trim()) { toast('请至少填写产品名称或型号', 'err'); return; }
    const rec = await save('products', { ...p, price: p.price === '' ? '' : Number(p.price) });
    toast('已保存到产品库');
    onSaved?.(rec);
    onClose();
  };
  return (
    <Modal title={title} sub="这里的信息会作为报价单导入时的默认值" onClose={onClose} width={640}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn primary" onClick={submit}>保存</button></>}>
      <div className="pform">
        <div>
          <span className="field-label">产品图片</span>
          <ImageBox value={p.image} onChange={set('image')} size={150} label="点击上传图片" />
          <div className="field-hint" style={{ marginTop: 6 }}>自动压缩，建议白底</div>
        </div>
        <div className="grid2">
          <Field label="产品名称" span={2} hint="可换行，导出时按行显示（与 Excel 模板 A 列一致）">
            <textarea rows={2} value={p.name} onChange={set('name')} placeholder="例：High Efficiency&#10;PV Module" />
          </Field>
          <Field label="名称加粗补充（可选）" span={2} hint="系统方案版中显示为加粗，例：With UPS"><input value={p.nameBold || ''} onChange={set('nameBold')} /></Field>
          <Field label="质保"><input value={p.warranty} onChange={set('warranty')} placeholder="例：30 Years Power Warranty" /></Field>
          <Field label="指导价"><div className="color-in"><select className="select" style={{ width: 90 }} value={p.currency || 'RMB'} onChange={set('currency')}><option>RMB</option><option>USD</option></select><input type="number" step="0.01" value={p.price} onChange={set('price')} /></div></Field>
          <Field label="型号 / 规格" span={2} hint="可换行；用 **文字** 标记加粗"><textarea rows={3} value={p.model} onChange={set('model')} placeholder="例：Model: **SE6R-66HBD-650M**" /></Field>
          <Field label="分类">
            <input list="cat-list" value={p.category} onChange={set('category')} placeholder="选择或输入" />
            <datalist id="cat-list">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Products({ query, setQuery }) {
  const { data, remove, save, toast } = useStore();
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const cats = [...new Set(data.products.map((x) => x.category).filter(Boolean))];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.products
      .filter((p) => !cat || p.category === cat)
      .filter((p) => !q || [p.name, p.model, p.warranty, p.category].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [data.products, query, cat]);
  const usd = data.products.filter((p) => p.currency === 'USD').length;

  return (
    <div className="page">
      <div className="kpi-card">
        <div className="kpi">
          <div className="kpi-icon"><LuPackage /></div>
          <div><div className="kpi-label">产品总数</div><div className="kpi-value">{data.products.length}</div></div>
        </div>
        <div className="kpi-div" />
        <div className="kpi-cats">
          <div className="kpi-label" style={{ marginBottom: 10 }}>分类分布</div>
          <div className="chips">
            {cats.map((c) => <span key={c} className="chip">{c} <b>{data.products.filter((p) => p.category === c).length}</b></span>)}
            {!cats.length && <span className="muted">暂无分类</span>}
          </div>
        </div>
        <div className="kpi-div" />
        <div className="kpi"><div><div className="kpi-label">币种</div><div className="kpi-value sm">RMB {data.products.length - usd} · USD {usd}</div></div></div>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索名称、型号、质保…" />
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">全部分类</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="grow" />
        <button className="btn primary" onClick={() => setEdit({})}><LuPlus /> 新增产品</button>
      </div>

      {list.length ? (
        <table className="table">
          <thead><tr><th style={{ width: 76 }}>图片</th><th>产品名称</th><th>质保</th><th>型号 / 规格</th><th>分类</th><th className="r">指导价</th><th>更新日期</th><th style={{ width: 120 }} /></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td><div className="thumb">{p.image ? <img src={p.image} alt="" /> : null}</div></td>
                <td style={{ maxWidth: 320 }}><div className="strong clamp">{firstLine(p.name) || '—'}</div>{p.nameBold && <div className="muted sm clamp">{p.nameBold}</div>}</td>
                <td className="muted">{p.warranty || '—'}</td>
                <td style={{ maxWidth: 240 }}><div className="clamp">{(p.model || '—').replace(/\*\*/g, '')}</div></td>
                <td>{p.category ? <span className="chip">{p.category}</span> : '—'}</td>
                <td className="r strong">{p.price === '' || p.price == null ? '—' : fmtMoney(p.price, p.currency === 'USD' ? '$' : '¥')}<div className="muted sm">{p.currency || 'RMB'}</div></td>
                <td className="muted">{fmtDate(p.updatedAt)}</td>
                <td className="r">
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => setEdit(p)}>编辑</button>
                    <Menu items={[
                      { label: '复制为新产品', icon: <LuCopy />, onClick: async () => { await save('products', { ...p, id: undefined, createdAt: undefined, name: p.name + ' (副本)' }); toast('已复制'); } },
                      { label: '编辑', icon: <LuPencil />, onClick: () => setEdit(p) },
                      '-',
                      { label: '删除', icon: <LuTrash2 />, danger: true, onClick: () => setDel(p) },
                    ]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty icon={<LuPackage />} title="没有找到产品" text="调整搜索条件，或新增一个产品" action={<button className="btn primary" onClick={() => setEdit({})}><LuPlus /> 新增产品</button>} />}

      {edit && <ProductForm initial={edit} title={edit.id ? '编辑产品' : '新增产品'} onClose={() => setEdit(null)} />}
      {del && <Confirm title="删除产品" danger okText="删除" text={`确定删除「${firstLine(del.name) || del.model}」吗？已生成的报价单不受影响。`} onOk={async () => { await remove('products', del.id); toast('已删除'); }} onClose={() => setDel(null)} />}
    </div>
  );
}
