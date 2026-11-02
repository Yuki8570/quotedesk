import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LuArrowLeft, LuPlus, LuPackagePlus, LuFileSpreadsheet, LuFileDown, LuSave, LuBookmarkPlus, LuTrash2,
  LuArrowUp, LuArrowDown, LuCopy, LuRefreshCw, LuDatabase, LuX, LuCheck, LuMaximize2, LuPackage, LuEye,
} from 'react-icons/lu';
import { useStore, defaultBrand } from '../store.jsx';
import { Modal, ImageBox, SearchInput, Field, Menu, Confirm, STATUS, Empty } from '../ui.jsx';
import { ProductForm } from './Products.jsx';
import { SaveTemplateModal } from './Templates.jsx';
import { fmtMoney, firstLine, pickFile, processImage } from '../util.js';
import { itemAmount, quoteTotal, ROW_H } from '../layout.js';
import { exportExcel, exportPdf, switchLayout } from '../exporters.js';
import { renderAny, paginateAny } from '../render.js';
import { LAYOUTS, layoutOf, SYS_DEFAULTS, SYS } from '../layout2.js';
import { uid } from '../seed.js';

const LIB_FIELDS = ['name', 'nameBold', 'warranty', 'model', 'price', 'image'];
const itemFromProduct = (p, sys) => ({
  id: uid(), productId: p.id, name: p.name || '', nameBold: p.nameBold || '', warranty: p.warranty || '', model: p.model || '',
  price: p.price ?? '', image: p.image || '', qty: 1, rowHeight: sys ? SYS.rowH.item : ROW_H.item, amountNote: '',
});

// ---------------- 产品选择弹窗 ----------------
function ProductPicker({ onClose, onPick }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sel, setSel] = useState([]);
  const cats = [...new Set(data.products.map((p) => p.category).filter(Boolean))];
  const list = data.products
    .filter((p) => !cat || p.category === cat)
    .filter((p) => !q.trim() || [p.name, p.model, p.warranty, p.category].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const confirm = () => { onPick(sel.map((id) => data.products.find((p) => p.id === id))); onClose(); };
  return (
    <Modal title="从产品库选择" sub="支持多选，导入后仍可在报价单中修改" onClose={onClose} width={760}
      footer={<>
        <span className="muted grow">已选 <b className="text-primary">{sel.length}</b> 项</span>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" disabled={!sel.length} onClick={confirm}><LuCheck /> 导入 {sel.length || ''} 项</button>
      </>}>
      <div className="picker-top">
        <SearchInput autoFocus value={q} onChange={setQ} placeholder="搜索名称、型号、质保、分类…" style={{ flex: 1 }} />
      </div>
      <div className="chips" style={{ margin: '12px 0' }}>
        <button className={'chip btnchip' + (!cat ? ' on' : '')} onClick={() => setCat('')}>全部 <b>{data.products.length}</b></button>
        {cats.map((c) => <button key={c} className={'chip btnchip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="picker-list">
        {list.map((p) => {
          const on = sel.includes(p.id);
          return (
            <div key={p.id} className={'picker-row' + (on ? ' on' : '')} onClick={() => toggle(p.id)} onDoubleClick={() => { onPick([p]); onClose(); }}>
              <span className={'check' + (on ? ' on' : '')}>{on && <LuCheck />}</span>
              <div className="thumb">{p.image && <img src={p.image} alt="" />}</div>
              <div className="grow">
                <div className="strong">{firstLine(p.name) || '—'}</div>
                <div className="muted sm">{[firstLine(p.model).replace(/\*\*/g, ''), p.warranty].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              {p.category && <span className="chip">{p.category}</span>}
              <div className="strong" style={{ width: 110, textAlign: 'right' }}>{p.price === '' || p.price == null ? '—' : fmtMoney(p.price, p.currency === 'USD' ? '$' : '¥')}</div>
            </div>
          );
        })}
        {!list.length && <Empty icon={<LuPackage />} title="没有匹配的产品" />}
      </div>
    </Modal>
  );
}

// ---------------- 实时预览 ----------------
function Preview({ draft, brand, big }) {
  const ref = useRef(null);
  const [pages, setPages] = useState(1);
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      if (!ref.current || !brand) return;
      const scale = (window.devicePixelRatio || 1) * (big ? 1.2 : 0.75);
      const { rows } = await renderAny(draft, brand, scale, { canvas: ref.current, pageBreaks: true });
      if (!cancel) setPages(paginateAny(draft, rows).length);
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [draft, brand, big]);
  return (
    <div className={'preview' + (big ? ' big' : '')}>
      <canvas ref={ref} />
      <div className="preview-foot">A4 纵向 · {layoutOf(draft) === 'system' ? '按页宽缩放' : '60% 缩放'} · 共 {pages} 页{pages > 1 ? '（蓝色虚线为分页位置）' : ''}</div>
    </div>
  );
}

// ---------------- 明细行 ----------------
function ItemRow({ it, idx, count, product, sys, sym, update, move, dup, del, toLibrary, updateLibrary, resetFromLibrary }) {
  const set = (k) => (e) => update({ ...it, [k]: e?.target ? e.target.value : e });
  const modified = product && LIB_FIELDS.some((k) => String(product[k] ?? '') !== String(it[k] ?? ''));
  return (
    <div className="item-row">
      <div className="item-idx">{idx + 1}</div>
      <ImageBox value={it.image} onChange={set('image')} size={72} />
      <div className="item-main">
        <textarea rows={2} value={it.name} onChange={set('name')} placeholder="产品名称（可换行）" />
        {sys && <input value={it.nameBold || ''} onChange={set('nameBold')} placeholder="加粗补充（可选），例：With UPS" />}
        <input value={it.warranty} onChange={set('warranty')} placeholder={sys ? '质保，例：5 Years（导出为 [5 Years]）' : '质保（可选）'} />
        <div className="item-tag">
          {product ? (modified
            ? <span className="tag tag-warn" title="与产品库数据不同，仅影响本报价单">已修改</span>
            : <span className="tag tag-lib">产品库</span>)
            : <span className="tag tag-manual">手动录入</span>}
          {!product && <button className="link" onClick={() => toLibrary(false)}><LuDatabase /> 存入产品库</button>}
          {modified && <button className="link" onClick={updateLibrary}><LuRefreshCw /> 同步到产品库</button>}
          <label className="rh" title="导出 Excel 时该行的行高（磅），图片会按行高自动缩放">行高<input className="item-h" type="number" value={it.rowHeight} onChange={set('rowHeight')} /></label>
        </div>
      </div>
      <textarea className="item-model" rows={3} value={it.model} onChange={set('model')} placeholder={sys ? '型号 / 规格，**文字** 加粗' : '型号 / 规格'} />
      <input className="item-num" type="number" value={it.qty} onChange={set('qty')} placeholder="数量" />
      <input className="item-num" type="number" step="0.01" value={it.price} onChange={set('price')} placeholder="单价" />
      <div className="item-amt">
        {it.amountNote ? <span style={{ color: '#E03131' }}>{it.amountNote}</span> : fmtMoney(itemAmount(it), sym)}
        {sys && (
          <select className="note-sel" value={it.amountNote || ''} onChange={set('amountNote')} title="金额栏显示">
            <option value="">计入合计</option><option value="Optional">Optional</option><option value="FREE">FREE</option>
          </select>
        )}
      </div>
      <Menu items={[
        { label: '上移', icon: <LuArrowUp />, disabled: idx === 0, onClick: () => move(-1) },
        { label: '下移', icon: <LuArrowDown />, disabled: idx === count - 1, onClick: () => move(1) },
        { label: '复制此行', icon: <LuCopy />, onClick: dup },
        '-',
        !product && { label: '存入产品库', icon: <LuDatabase />, onClick: () => toLibrary(false) },
        product && { label: '另存为新产品', icon: <LuDatabase />, onClick: () => toLibrary(true) },
        modified && { label: '同步修改到产品库', icon: <LuRefreshCw />, onClick: updateLibrary },
        modified && { label: '恢复产品库数据', icon: <LuRefreshCw />, onClick: resetFromLibrary },
        '-',
        { label: '删除此行', icon: <LuTrash2 />, danger: true, onClick: del },
      ]} />
    </div>
  );
}

// ---------------- 编辑器 ----------------
export default function Editor({ kind, id, draft: initDraft, go, setGuard }) {
  const { data, save, toast } = useStore();
  const store = kind === 'template' ? 'templates' : 'quotes';
  const initial = useMemo(() => initDraft || data[store].find((x) => x.id === id), []); // eslint-disable-line
  const [draft, setDraft] = useState(() => (initial ? structuredClone(initial) : null));
  const [savedJson, setSavedJson] = useState(() => (initDraft ? '' : JSON.stringify(initial)));
  const [picker, setPicker] = useState(false);
  const [pform, setPform] = useState(null);
  const [tplModal, setTplModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [bigPreview, setBigPreview] = useState(false);
  const [busy, setBusy] = useState('');

  const dirty = draft && JSON.stringify(draft) !== savedJson;
  useEffect(() => { setGuard(() => dirty); return () => setGuard(null); }, [dirty, setGuard]);
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!draft) return <div className="page"><Empty title="未找到该记录" action={<button className="btn" onClick={() => go(kind === 'template' ? 'templates' : 'quotes')}>返回</button>} /></div>;

  const brand = data.brands.find((b) => b.id === draft.brandId) || defaultBrand(data.brands);
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e?.target ? e.target.value : e }));
  const setItems = (fn) => setDraft((d) => ({ ...d, items: fn(d.items) }));
  const updateItem = (i) => (v) => setItems((list) => list.map((x, j) => (j === i ? v : x)));
  const productOf = (it) => it.productId && data.products.find((p) => p.id === it.productId);

  const doSave = async () => {
    const rec = await save(store, draft);
    setDraft(rec); setSavedJson(JSON.stringify(rec));
    toast(kind === 'template' ? '模板已保存' : '报价单已保存');
  };
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); toast('导出完成'); } catch (e) { console.error(e); toast('导出失败：' + e.message, 'err'); }
    setBusy('');
  };
  const back = () => go(kind === 'template' ? 'templates' : 'quotes');
  const total = quoteTotal(draft);
  const sys = layoutOf(draft) === 'system';
  const sym = LAYOUTS[layoutOf(draft)].symbol;
  const S = { ...SYS_DEFAULTS(), ...(draft.sys || {}) };
  const setS = (patch) => setDraft((d) => ({ ...d, sys: { ...SYS_DEFAULTS(), ...(d.sys || {}), ...patch } }));
  const listEditor = (list, onChange, addLabel) => (
    <div>
      {list.map((t, i) => (
        <div key={i} className="term-row">
          <input value={t} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="icon-btn" disabled={i === 0} onClick={() => { const a = [...list]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}><LuArrowUp /></button>
          <button className="icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))}><LuX /></button>
        </div>
      ))}
      <button className="btn sm" onClick={() => onChange([...list, ''])}><LuPlus /> {addLabel}</button>
    </div>
  );

  return (
    <div className="editor">
      <div className="editor-bar">
        <button className="icon-btn" onClick={back} title="返回"><LuArrowLeft /></button>
        <div className="grow">
          <div className="editor-title">
            {kind === 'template' ? `模板：${draft.name || '未命名'}` : draft.no}
            {dirty ? <span className="tag tag-warn">未保存</span> : <span className="tag tag-ok">已保存</span>}
          </div>
          <div className="muted sm">{kind === 'template' ? '编辑常用模板，保存后可基于它新建报价单' : (draft.fromTemplate ? `基于模板「${draft.fromTemplate}」创建` : '编辑报价单')}</div>
        </div>
        <button className="btn" onClick={() => setBigPreview(true)}><LuEye /> 预览</button>
        {kind === 'quote' && <button className="btn" onClick={() => setTplModal(true)}><LuBookmarkPlus /> 存为模板</button>}
        <button className="btn" disabled={!!busy} onClick={() => run('pdf', () => exportPdf(draft, brand))}><LuFileDown /> {busy === 'pdf' ? '生成中…' : '导出 PDF'}</button>
        <button className="btn" disabled={!!busy} onClick={() => run('xlsx', () => exportExcel(draft, brand))}><LuFileSpreadsheet /> {busy === 'xlsx' ? '生成中…' : '导出 Excel'}</button>
        <button className="btn primary" onClick={doSave}><LuSave /> 保存</button>
      </div>

      <div className="editor-body">
        <div className="editor-left">
          <section className="card">
            <div className="card-title">基本信息</div>
            <div className="layout-switch">
              {Object.entries(LAYOUTS).map(([k, v]) => (
                <button key={k} className={'layout-opt' + (layoutOf(draft) === k ? ' on' : '')} onClick={() => setDraft((d) => switchLayout(d, k))}>
                  <b>{k === 'system' ? '系统方案版' : '经典版'}</b><span>{v.label.replace(/^[^（]*/, '')}</span>
                </button>
              ))}
            </div>
            <div className="grid3">
              <Field label="抬头">
                <select className="select" value={brand?.id} onChange={set('brandId')}>
                  {data.brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? '（默认）' : ''}</option>)}
                </select>
              </Field>
              {kind === 'quote' ? <>
                <Field label="报价单号"><input value={draft.no} onChange={set('no')} /></Field>
                <Field label="状态">
                  <select className="select" value={draft.status || 'draft'} onChange={set('status')}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label="客户名称"><input value={draft.customer} onChange={set('customer')} placeholder="客户 / 公司" /></Field>
                <Field label="报价日期"><input type="date" value={draft.date} onChange={set('date')} /></Field>
                <Field label="文件名" hint="导出的 Excel / PDF 文件名"><input value={draft.title} onChange={set('title')} placeholder="例：25.2.14_12kW_solar_system" /></Field>
              </> : <>
                <Field label="模板名称"><input value={draft.name} onChange={set('name')} /></Field>
                <Field label="说明"><input value={draft.desc} onChange={set('desc')} /></Field>
              </>}
            </div>
            {brand && (
              <div className="brand-strip">
                {brand.logo && <img src={brand.logo} alt="" />}
                <div className="grow"><div className="strong">{brand.company}</div><div className="muted sm">{[brand.tel && 'Tel: ' + brand.tel, brand.web && 'Web: ' + brand.web, brand.email && 'Email: ' + brand.email].filter(Boolean).join('   ')}</div></div>
                <span className="swatch" style={{ background: brand.color }} title="主题色" />
                <span className="swatch" style={{ background: brand.accent }} title="辅助色" />
              </div>
            )}
          </section>

          {sys && (
            <section className="card">
              <div className="card-title">项目信息与联系人</div>
              <div className="sys-grid">
                <div>
                  <span className="field-label">PROJECT INFORMATION（左栏：标签 / 内容）</span>
                  {S.project.map((p, i) => (
                    <div key={i} className="pair">
                      <input value={p[0]} onChange={(e) => setS({ project: S.project.map((x, j) => (j === i ? [e.target.value, x[1]] : x)) })} />
                      <input value={p[1]} onChange={(e) => setS({ project: S.project.map((x, j) => (j === i ? [x[0], e.target.value] : x)) })} placeholder="内容" />
                    </div>
                  ))}
                </div>
                <div>
                  <span className="field-label">CONTACT（右栏）</span>
                  <div className="pair"><span className="pair-l">Name</span><input value={S.contact.name} onChange={(e) => setS({ contact: { ...S.contact, name: e.target.value } })} placeholder="业务员姓名" /></div>
                  <div className="pair"><span className="pair-l">Phone/WhatsApp</span><input value={S.contact.phone} onChange={(e) => setS({ contact: { ...S.contact, phone: e.target.value } })} placeholder="电话 / WhatsApp / 微信" /></div>
                  <div className="pair"><span className="pair-l">Email</span><input value={S.contact.email} onChange={(e) => setS({ contact: { ...S.contact, email: e.target.value } })} /></div>
                </div>
              </div>
              <div className="card-title" style={{ marginTop: 20 }}>方案标题</div>
              <div className="grid3">
                <Field label="标题高亮部分（主题色）"><input value={S.titleHL} onChange={(e) => setS({ titleHL: e.target.value })} placeholder="例：500KW+1.8MWh" /></Field>
                <Field label="标题其余部分"><input value={S.titleRest} onChange={(e) => setS({ titleRest: e.target.value })} placeholder="例：Energy Storage System" /></Field>
                <Field label="日期（显示为 Date: 年/月/日）"><input type="date" value={draft.date || ''} onChange={set('date')} /></Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field label="副标题（用 **文字** 标记加粗）"><input value={S.subtitle} onChange={(e) => setS({ subtitle: e.target.value })} placeholder="例：[**500kW** Three Phase Inverter] + [**1.881MWh** Battery Bank]" /></Field>
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-title-row">
              <div className="card-title">产品明细 <span className="muted sm">（{draft.items.length} 项）</span></div>
              <div className="grow" />
              <button className="btn" onClick={() => setItems((l) => [...l, { id: uid(), name: '', nameBold: '', warranty: '', model: '', qty: 1, price: '', image: '', rowHeight: sys ? SYS.rowH.item : ROW_H.item, amountNote: '' }])}><LuPlus /> 手动添加</button>
              <button className="btn primary" onClick={() => setPicker(true)}><LuPackagePlus /> 从产品库选择</button>
            </div>
            <div className="item-head">
              <span>#</span><span>图片</span><span>产品名称 / 质保</span><span>型号 / 规格</span><span>数量</span><span>单价 ({sys ? 'USD' : 'RMB'})</span><span className="r">金额</span><span />
            </div>
            {draft.items.map((it, i) => (
              <ItemRow key={it.id} it={it} idx={i} count={draft.items.length} product={productOf(it)} sys={sys} sym={sym}
                update={updateItem(i)}
                move={(d) => setItems((l) => { const a = [...l]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; })}
                dup={() => setItems((l) => [...l.slice(0, i + 1), { ...it, id: uid() }, ...l.slice(i + 1)])}
                del={() => setItems((l) => l.filter((_, j) => j !== i))}
                toLibrary={(asNew) => setPform({ i, initial: { currency: sys ? 'USD' : 'RMB', name: it.name, nameBold: it.nameBold || '', warranty: it.warranty, model: it.model, price: it.price, image: it.image, category: (!asNew && productOf(it)?.category) || '' } })}
                updateLibrary={() => setConfirm({
                  title: '同步到产品库', text: `将本行的名称、质保、型号、单价、图片覆盖到产品库「${firstLine(productOf(it).name)}」？其它报价单不受影响。`,
                  onOk: async () => { const p = productOf(it); await save('products', { ...p, name: it.name, nameBold: it.nameBold || '', warranty: it.warranty, model: it.model, price: it.price === '' ? '' : Number(it.price), image: it.image }); toast('产品库已更新'); },
                })}
                resetFromLibrary={() => { const p = productOf(it); updateItem(i)({ ...it, name: p.name, nameBold: p.nameBold || '', warranty: p.warranty, model: p.model, price: p.price, image: p.image }); }}
              />
            ))}
            {!draft.items.length && (
              <div className="items-empty">
                <LuPackage />
                <div>还没有产品，点击<b>从产品库选择</b>导入，或<b>手动添加</b>后再存入产品库</div>
              </div>
            )}
            <div className="items-total">
              <span className="muted">合计{sys ? '（不含 Optional / FREE）' : ''}</span><span className="total-num">{fmtMoney(total, sym)}</span>
            </div>
          </section>

{sys ? (
          <section className="card">
            <div className="card-title">合计行、条款与名片</div>
            <div className="grid1">
              <Field label="合计行文字"><input value={draft.totalLabel} onChange={set('totalLabel')} /></Field>
              <div className="sys-grid">
                <div><span className="field-label">条款 · 左栏（每行自动加 •）</span>{listEditor(S.termsL, (v) => setS({ termsL: v }), '添加')}</div>
                <div><span className="field-label">条款 · 右栏</span>{listEditor(S.termsR, (v) => setS({ termsR: v }), '添加')}</div>
              </div>
              <div>
                <span className="field-label">底部名片横幅（可选，建议宽高比约 6:1）</span>
                <div className="card-banner" onClick={async () => { const f = await pickFile(); if (f) setS({ card: await processImage(f, { maxSize: 2400 }) }); }}>
                  {S.card ? <img src={S.card} alt="" /> : <span className="muted"><LuPlus /> 点击上传业务员名片横幅</span>}
                  {S.card && <button className="imgbox-del" style={{ display: 'grid' }} onClick={(e) => { e.stopPropagation(); setS({ card: '' }); }}><LuX /></button>}
                </div>
                <div className="field-hint" style={{ marginTop: 6 }}>与原模板相同，以 WPS 单元格图片方式写入 Excel；名片只保存在本机浏览器里。</div>
              </div>
            </div>
          </section>
          ) : (
          <section className="card">
            <div className="card-title">合计行与条款</div>
            <div className="grid1">
              <Field label="合计行文字"><input value={draft.totalLabel} onChange={set('totalLabel')} /></Field>
              <div>
                <span className="field-label">条款（每条占一行，显示在合计下方）</span>
                {draft.terms.map((t, i) => (
                  <div key={i} className="term-row">
                    <input value={t} onChange={(e) => set('terms')(draft.terms.map((x, j) => (j === i ? e.target.value : x)))} />
                    <button className="icon-btn" disabled={i === 0} onClick={() => { const a = [...draft.terms]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set('terms')(a); }}><LuArrowUp /></button>
                    <button className="icon-btn" onClick={() => set('terms')(draft.terms.filter((_, j) => j !== i))}><LuX /></button>
                  </div>
                ))}
                <button className="btn sm" onClick={() => set('terms')([...draft.terms, ''])}><LuPlus /> 添加条款</button>
              </div>
              <Field label="工作表名称" hint="Excel 底部 Sheet 标签名，原模板为「10」"><input value={draft.sheetName} onChange={set('sheetName')} style={{ maxWidth: 240 }} /></Field>
            </div>
          </section>
          )}
        </div>

        <aside className="editor-right">
          <div className="card preview-card">
            <div className="card-title-row">
              <div className="card-title">实时预览</div>
              <div className="grow" />
              <button className="icon-btn" title="放大预览" onClick={() => setBigPreview(true)}><LuMaximize2 /></button>
            </div>
            {brand && <Preview draft={draft} brand={brand} />}
          </div>
        </aside>
      </div>

      {picker && <ProductPicker onClose={() => setPicker(false)} onPick={(ps) => { setItems((l) => [...l, ...ps.map((p) => itemFromProduct(p, sys))]); toast(`已导入 ${ps.length} 个产品`); }} />}
      {pform && <ProductForm title="存入产品库" initial={pform.initial} onClose={() => setPform(null)}
        onSaved={(p) => updateItem(pform.i)({ ...draft.items[pform.i], productId: p.id, name: p.name, nameBold: p.nameBold || '', warranty: p.warranty, model: p.model, price: p.price, image: p.image })} />}
      {tplModal && <SaveTemplateModal source={draft} onClose={() => setTplModal(false)} />}
      {confirm && <Confirm {...confirm} onClose={() => setConfirm(null)} />}
      {bigPreview && <Modal title="预览" sub="与导出的 PDF 版式一致" width={1000} onClose={() => setBigPreview(false)}><Preview draft={draft} brand={brand} big /></Modal>}
    </div>
  );
}
