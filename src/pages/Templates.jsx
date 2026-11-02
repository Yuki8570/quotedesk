import { useMemo, useState } from 'react';
import { LuLayoutTemplate, LuPencil, LuTrash2, LuPlus, LuCopy } from 'react-icons/lu';
import { useStore, defaultBrand } from '../store.jsx';
import { Modal, Field, Empty, Menu, Confirm, SearchInput } from '../ui.jsx';
import { fmtMoney, fmtDate, firstLine } from '../util.js';
import { quoteTotal, DEFAULT_TERMS, DEFAULT_TOTAL_LABEL, DEFAULT_SHEET_NAME } from '../layout.js';
import { cloneItems, quoteFromTemplate } from '../exporters.js';
import { LAYOUTS, layoutOf } from '../layout2.js';
import { uid } from '../seed.js';

// 从报价单（或编辑器草稿）保存为常用模板
export function SaveTemplateModal({ source, onClose, onSaved }) {
  const { save, toast, data } = useStore();
  const [name, setName] = useState(source.title || source.no || '');
  const [desc, setDesc] = useState(source.items.map((i) => firstLine(i.name)).filter(Boolean).slice(0, 4).join(' + '));
  const [overwrite, setOverwrite] = useState('');
  const submit = async () => {
    if (!name.trim()) { toast('请填写模板名称', 'err'); return; }
    const base = overwrite ? data.templates.find((t) => t.id === overwrite) : {};
    const rec = await save('templates', {
      ...base, name: name.trim(), desc, brandId: source.brandId, items: cloneItems(source.items), layout: source.layout || 'classic', sys: source.sys ? structuredClone(source.sys) : undefined,
      totalLabel: source.totalLabel, terms: [...(source.terms || [])], sheetName: source.sheetName,
    });
    toast(overwrite ? '模板已更新' : '已保存为常用模板');
    onSaved?.(rec);
    onClose();
  };
  return (
    <Modal title="保存为常用模板" sub="保存产品明细、抬头和条款，之后可一键基于模板新建报价单" onClose={onClose} width={520}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn primary" onClick={submit}>保存模板</button></>}>
      <div className="grid1">
        <Field label="模板名称"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例：12kW 离网储能系统" /></Field>
        <Field label="说明（可选）"><textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        {data.templates.length > 0 && (
          <Field label="保存方式">
            <select className="select" value={overwrite} onChange={(e) => { setOverwrite(e.target.value); const t = data.templates.find((x) => x.id === e.target.value); if (t) setName(t.name); }}>
              <option value="">新建一个模板</option>
              {data.templates.map((t) => <option key={t.id} value={t.id}>覆盖：{t.name}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

export default function Templates({ query, setQuery, go }) {
  const { data, remove, save, toast } = useStore();
  const [del, setDel] = useState(null);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.templates.filter((t) => !q || (t.name + ' ' + t.desc).toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [data.templates, query]);
  const newTemplate = () => go('editor', {
    kind: 'template',
    draft: { id: uid(), name: '新模板', desc: '', brandId: defaultBrand(data.brands)?.id, items: [], totalLabel: DEFAULT_TOTAL_LABEL, terms: [...DEFAULT_TERMS], sheetName: DEFAULT_SHEET_NAME },
  });

  return (
    <div className="page">
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索模板…" />
        <div className="grow" />
        <button className="btn primary" onClick={newTemplate}><LuPlus /> 新建模板</button>
      </div>
      {list.length ? (
        <div className="tpl-grid">
          {list.map((t) => {
            const b = data.brands.find((x) => x.id === t.brandId);
            return (
              <div key={t.id} className="card tpl-card">
                <div className="tpl-head">
                  <div className="tpl-ico"><LuLayoutTemplate /></div>
                  <div className="grow">
                    <div className="strong">{t.name}</div>
                    <div className="muted sm">更新于 {fmtDate(t.updatedAt)}</div>
                  </div>
                  <Menu items={[
                    { label: '编辑模板', icon: <LuPencil />, onClick: () => go('editor', { kind: 'template', id: t.id }) },
                    { label: '复制模板', icon: <LuCopy />, onClick: async () => { await save('templates', { ...t, id: undefined, createdAt: undefined, name: t.name + ' (副本)', items: cloneItems(t.items) }); toast('已复制'); } },
                    '-',
                    { label: '删除', icon: <LuTrash2 />, danger: true, onClick: () => setDel(t) },
                  ]} />
                </div>
                {t.desc && <div className="tpl-desc">{t.desc}</div>}
                <div className="tpl-thumbs">
                  {t.items.slice(0, 5).map((i) => <div key={i.id} className="thumb sm" title={firstLine(i.name)}>{i.image && <img src={i.image} alt="" />}</div>)}
                  {t.items.length > 5 && <div className="thumb sm more">+{t.items.length - 5}</div>}
                </div>
                <div className="tpl-meta">
                  <span>{t.items.length} 个产品</span>
                  <span className="strong">{fmtMoney(quoteTotal(t), LAYOUTS[layoutOf(t)].symbol)}</span><span className="chip">{layoutOf(t) === 'system' ? '系统方案版' : '经典版'}</span>
                  {b && <span className="brand-chip"><span className="dot" style={{ background: b.color }} />{b.name}</span>}
                </div>
                <div className="tpl-actions">
                  <button className="btn" onClick={() => go('editor', { kind: 'template', id: t.id })}>编辑</button>
                  <button className="btn primary grow" onClick={() => go('editor', { kind: 'quote', draft: quoteFromTemplate(t, data.quotes) })}>用此模板新建报价单</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <Empty icon={<LuLayoutTemplate />} title="暂无常用模板" text="在报价单编辑页点击「存为模板」，或在这里新建" action={<button className="btn primary" onClick={newTemplate}><LuPlus /> 新建模板</button>} />}
      {del && <Confirm title="删除模板" danger okText="删除" text={`确定删除模板「${del.name}」吗？`} onOk={async () => { await remove('templates', del.id); toast('已删除'); }} onClose={() => setDel(null)} />}
    </div>
  );
}
