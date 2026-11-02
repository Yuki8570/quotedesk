import { useMemo, useState } from 'react';
import { LuPlus, LuFileText, LuFileSpreadsheet, LuFileDown, LuCopy, LuBookmarkPlus, LuTrash2, LuReceipt, LuLayoutTemplate } from 'react-icons/lu';
import { useStore, defaultBrand } from '../store.jsx';
import { SearchInput, Empty, Menu, Confirm, Pill, STATUS, Modal } from '../ui.jsx';
import { fmtMoney, fmtDate } from '../util.js';
import { quoteTotal } from '../layout.js';
import { LAYOUTS, layoutOf } from '../layout2.js';
const symOf = (q) => LAYOUTS[layoutOf(q)].symbol;
import { exportExcel, exportPdf, blankQuote, quoteFromTemplate, cloneItems, nextQuoteNo } from '../exporters.js';
import { SaveTemplateModal } from './Templates.jsx';

export function NewQuoteModal({ onClose, go }) {
  const { data } = useStore();
  const start = (q) => { onClose(); go('editor', { kind: 'quote', draft: q }); };
  return (
    <Modal title="新建报价单" sub="从空白开始，或基于常用模板快速生成" onClose={onClose} width={620}>
      <div className="new-grid">
        <button className="new-opt" onClick={() => start(blankQuote(defaultBrand(data.brands)?.id, data.quotes))}>
          <div className="new-ico"><LuPlus /></div>
          <div><div className="strong">空白报价单</div><div className="muted sm">使用默认抬头和默认条款</div></div>
        </button>
        {data.templates.map((t) => {
          const b = data.brands.find((x) => x.id === t.brandId);
          return (
            <button key={t.id} className="new-opt" onClick={() => start(quoteFromTemplate(t, data.quotes))}>
              <div className="new-ico tpl"><LuLayoutTemplate /></div>
              <div>
                <div className="strong">{t.name}</div>
                <div className="muted sm">{t.items.length} 个产品 · {fmtMoney(quoteTotal(t), symOf(t))}{b ? ' · ' + b.name : ''}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export default function Quotes({ query, setQuery, go }) {
  const { data, save, remove, toast } = useStore();
  const [tab, setTab] = useState('all');
  const [del, setDel] = useState(null);
  const [tpl, setTpl] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const brandOf = (q) => data.brands.find((b) => b.id === q.brandId) || defaultBrand(data.brands);
  const totalRMB = data.quotes.filter((q) => layoutOf(q) === 'classic').reduce((s, q) => s + quoteTotal(q), 0);
  const totalUSD = data.quotes.filter((q) => layoutOf(q) === 'system').reduce((s, q) => s + quoteTotal(q), 0);
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, data.quotes.filter((q) => (q.status || 'draft') === k).length]));
  const n = data.quotes.length || 1;

  const list = useMemo(() => {
    const s = query.trim().toLowerCase();
    return data.quotes
      .filter((q) => tab === 'all' || (q.status || 'draft') === tab)
      .filter((q) => !s || [q.no, q.title, q.customer, ...(q.items || []).map((i) => i.model + ' ' + i.name)].join(' ').toLowerCase().includes(s))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [data.quotes, query, tab]);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { console.error(e); toast('导出失败：' + e.message, 'err'); }
    setBusy('');
  };

  return (
    <div className="page">
      <div className="kpi-card">
        <div className="kpi">
          <div className="kpi-icon"><LuReceipt /></div>
          <div><div className="kpi-label">报价总金额</div><div className="kpi-value">{fmtMoney(totalUSD, '$')}</div><div className="muted sm">另有 {fmtMoney(totalRMB)}（经典版 RMB）</div></div>
        </div>
        <div className="kpi-div" />
        <div className="kpi-bar">
          <div className="kpi-count"><b>{data.quotes.length}</b> 份报价单</div>
          <div className="stack">
            {['draft', 'sent', 'won', 'lost'].map((k) => counts[k] ? <span key={k} className={'seg seg-' + k} style={{ width: (counts[k] / n) * 100 + '%' }} /> : null)}
          </div>
          <div className="legend">
            {['draft', 'sent', 'won', 'lost'].map((k) => <span key={k}><i className={'seg-' + k} />{STATUS[k].label}: <b>{counts[k]}</b></span>)}
          </div>
        </div>
      </div>

      <div className="tabs">
        {[['all', '全部'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索单号、客户、产品…" />
        <div className="grow" />
        <button className="btn primary" onClick={() => setNewOpen(true)}><LuPlus /> 新建报价单</button>
      </div>

      {list.length ? (
        <>
        <div className="mlist">
          {list.map((q) => {
            const b = brandOf(q);
            return (
              <div key={q.id} className="mcard" onClick={() => go('editor', { kind: 'quote', id: q.id })}>
                <div className="mcard-top"><span className="strong">{q.no}</span><Pill status={q.status} /></div>
                <div className="muted sm mcard-sub">{q.title || '未命名'}</div>
                <div className="mcard-meta">
                  <span className="brand-chip"><span className="dot" style={{ background: b?.color }} />{b?.name}</span>
                  <span>{q.customer || '—'}</span>
                  <span>{layoutOf(q) === 'system' ? '系统方案版' : '经典版'} · {q.items.length} 项</span>
                </div>
                <div className="mcard-foot" onClick={(e) => e.stopPropagation()}>
                  <span className="mcard-amt">{fmtMoney(quoteTotal(q), symOf(q))}</span>
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => go('editor', { kind: 'quote', id: q.id })}>编辑</button>
                    <Menu items={[
                      { label: '导出 Excel', icon: <LuFileSpreadsheet />, onClick: () => run(q.id + 'x', () => exportExcel(q, b)) },
                      { label: '导出 PDF', icon: <LuFileDown />, onClick: () => run(q.id + 'p', () => exportPdf(q, b)) },
                      '-',
                      { label: '复制报价单', icon: <LuCopy />, onClick: async () => { await save('quotes', { ...q, id: undefined, createdAt: undefined, no: nextQuoteNo(data.quotes), status: 'draft', items: cloneItems(q.items) }); toast('已复制'); } },
                      { label: '存为常用模板', icon: <LuBookmarkPlus />, onClick: () => setTpl(q) },
                      '-',
                      { label: '删除', icon: <LuTrash2 />, danger: true, onClick: () => setDel(q) },
                    ]} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <table className="table">
          <thead><tr><th>报价单</th><th>客户</th><th>抬头</th><th>日期</th><th>状态</th><th className="r">金额</th><th style={{ width: 120 }} /></tr></thead>
          <tbody>
            {list.map((q) => {
              const b = brandOf(q);
              const total = quoteTotal(q);
              return (
                <tr key={q.id} className="clickable" onDoubleClick={() => go('editor', { kind: 'quote', id: q.id })}>
                  <td>
                    <div className="strong">{q.no}</div>
                    <div className="muted sm">{q.title || '未命名'} · {q.items.length} 项 · {layoutOf(q) === 'system' ? '系统方案版' : '经典版'}</div>
                  </td>
                  <td>{q.customer || <span className="muted">—</span>}</td>
                  <td><span className="brand-chip"><span className="dot" style={{ background: b?.color }} />{b?.name}</span></td>
                  <td>{q.date || fmtDate(q.createdAt)}</td>
                  <td><Pill status={q.status} /></td>
                  <td className="r strong">{fmtMoney(total, symOf(q))}</td>
                  <td className="r">
                    <div className="row-actions">
                      <button className="btn sm" onClick={() => go('editor', { kind: 'quote', id: q.id })}>编辑</button>
                      <Menu items={[
                        { label: busy === q.id + 'x' ? '导出中…' : '导出 Excel', icon: <LuFileSpreadsheet />, onClick: () => run(q.id + 'x', () => exportExcel(q, b)) },
                        { label: busy === q.id + 'p' ? '导出中…' : '导出 PDF', icon: <LuFileDown />, onClick: () => run(q.id + 'p', () => exportPdf(q, b)) },
                        '-',
                        { label: '复制报价单', icon: <LuCopy />, onClick: async () => { await save('quotes', { ...q, id: undefined, createdAt: undefined, no: nextQuoteNo(data.quotes), status: 'draft', items: cloneItems(q.items) }); toast('已复制'); } },
                        { label: '存为常用模板', icon: <LuBookmarkPlus />, onClick: () => setTpl(q) },
                        '-',
                        { label: '删除', icon: <LuTrash2 />, danger: true, onClick: () => setDel(q) },
                      ]} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </>
      ) : <Empty icon={<LuFileText />} title="暂无报价单" text={query ? '没有匹配的结果' : '点击右上角新建第一份报价单'} action={<button className="btn primary" onClick={() => setNewOpen(true)}><LuPlus /> 新建报价单</button>} />}

      {newOpen && <NewQuoteModal onClose={() => setNewOpen(false)} go={go} />}
      {tpl && <SaveTemplateModal source={tpl} onClose={() => setTpl(null)} />}
      {del && <Confirm title="删除报价单" danger okText="删除" text={`确定删除 ${del.no} 吗？此操作不可撤销。`} onOk={async () => { await remove('quotes', del.id); toast('已删除'); }} onClose={() => setDel(null)} />}
    </div>
  );
}
