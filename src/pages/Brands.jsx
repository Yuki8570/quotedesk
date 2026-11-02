import { useState } from 'react';
import { LuPlus, LuPalette, LuStar, LuTrash2, LuPencil } from 'react-icons/lu';
import { useStore } from '../store.jsx';
import { Modal, ImageBox, Field, Empty, Menu, Confirm } from '../ui.jsx';
import { DEFAULT_PRIMARY, DEFAULT_ACCENT } from '../layout.js';

export function BrandHeader({ b, compact }) {
  return (
    <div className={'bh' + (compact ? ' compact' : '')}>
      <div className="bh-top">
        {b.logo ? <img className="bh-logo" src={b.logo} alt="" /> : <span className="bh-logo ph">LOGO</span>}
        <div className="bh-company">{b.company || '公司名称'}</div>
      </div>
      <div className="bh-contact">
        {b.tel && <><b>Tel:</b>{b.tel}&nbsp;&nbsp;</>}
        {b.web && <><b>Web:</b> {b.web}&nbsp;&nbsp;</>}
        {b.email && <><b>Email:</b> {b.email}</>}
      </div>
      <div className="bh-bar" style={{ background: b.color || DEFAULT_PRIMARY, borderRightColor: b.accent || DEFAULT_ACCENT }}>
        <span>Parts &amp; Warranty</span><span>Picture</span><span>Specification</span><span>Qty</span><span>Unit price</span><span>Amount</span>
      </div>
    </div>
  );
}

function BrandForm({ initial, onClose }) {
  const { save, toast } = useStore();
  const [b, setB] = useState({ name: '', company: '', tel: '', web: '', email: '', color: DEFAULT_PRIMARY, accent: DEFAULT_ACCENT, logo: '', ...initial });
  const set = (k) => (e) => setB({ ...b, [k]: e?.target ? e.target.value : e });
  const submit = async () => {
    if (!b.company.trim()) { toast('请填写公司名称', 'err'); return; }
    await save('brands', { ...b, name: b.name.trim() || b.company });
    toast('抬头已保存');
    onClose();
  };
  return (
    <Modal title={b.id ? '编辑抬头' : '新增抬头'} sub="LOGO、公司名称、联系方式和主题色会应用到导出的 Excel / PDF" onClose={onClose} width={720}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn primary" onClick={submit}>保存</button></>}>
      <div className="brand-form">
        <div>
          <span className="field-label">LOGO（建议透明背景 PNG，横向）</span>
          <div className="logo-up"><ImageBox value={b.logo} onChange={set('logo')} size={120} keepAlpha maxSize={1200} label="上传 LOGO" /></div>
        </div>
        <div className="grid2">
          <Field label="抬头名称（内部识别用）"><input value={b.name} onChange={set('name')} placeholder="例：SunEvo 外贸" /></Field>
          <Field label="公司名称（显示在表头）"><input value={b.company} onChange={set('company')} placeholder="例：SunEvo Solar Co., Ltd." /></Field>
          <Field label="电话 Tel"><input value={b.tel} onChange={set('tel')} /></Field>
          <Field label="网址 Web"><input value={b.web} onChange={set('web')} /></Field>
          <Field label="邮箱 Email（可选）" span={2}><input value={b.email} onChange={set('email')} /></Field>
          <div className="grid2" style={{ gridColumn: 'span 2' }}>
            <Field label="主题色">
              <div className="color-in"><input type="color" value={b.color} onChange={set('color')} /><input value={b.color} onChange={set('color')} /></div>
            </Field>
            <Field label="辅助色">
              <div className="color-in"><input type="color" value={b.accent} onChange={set('accent')} /><input value={b.accent} onChange={set('accent')} /></div>
            </Field>
          </div>
        </div>
      </div>
      <div className="field-label" style={{ marginTop: 18 }}>效果预览</div>
      <BrandHeader b={b} />
    </Modal>
  );
}

export default function Brands() {
  const { data, save, remove, toast } = useStore();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const setDefault = async (b) => {
    for (const x of data.brands) if (x.isDefault && x.id !== b.id) await save('brands', { ...x, isDefault: false });
    await save('brands', { ...b, isDefault: true });
    toast(`已设为默认抬头：${b.name}`);
  };
  return (
    <div className="page">
      <div className="toolbar">
        <div className="muted">共 {data.brands.length} 个抬头。新建报价单时默认使用带 ★ 的抬头，编辑时可随时切换。</div>
        <div className="grow" />
        <button className="btn primary" onClick={() => setEdit({})}><LuPlus /> 新增抬头</button>
      </div>
      {data.brands.length ? (
        <div className="brand-grid">
          {[...data.brands].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)).map((b) => (
            <div key={b.id} className="card brand-card">
              <div className="brand-card-head">
                <div className="brand-name">
                  <span className="dot" style={{ background: b.color }} />{b.name}
                  {b.isDefault && <span className="pill pill-blue"><LuStar /> 默认</span>}
                </div>
                <div className="row-actions">
                  <button className="btn sm" onClick={() => setEdit(b)}>编辑</button>
                  <Menu items={[
                    { label: '设为默认', icon: <LuStar />, disabled: b.isDefault, onClick: () => setDefault(b) },
                    { label: '编辑', icon: <LuPencil />, onClick: () => setEdit(b) },
                    '-',
                    { label: '删除', icon: <LuTrash2 />, danger: true, disabled: data.brands.length <= 1, onClick: () => setDel(b) },
                  ]} />
                </div>
              </div>
              <BrandHeader b={b} compact />
            </div>
          ))}
        </div>
      ) : <Empty icon={<LuPalette />} title="还没有抬头" action={<button className="btn primary" onClick={() => setEdit({})}><LuPlus /> 新增抬头</button>} />}
      {edit && <BrandForm initial={edit} onClose={() => setEdit(null)} />}
      {del && <Confirm title="删除抬头" danger okText="删除" text={`确定删除「${del.name}」吗？使用该抬头的报价单将改用默认抬头。`} onOk={async () => { await remove('brands', del.id); toast('已删除'); }} onClose={() => setDel(null)} />}
    </div>
  );
}
