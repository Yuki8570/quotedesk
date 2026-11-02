import { useEffect, useRef, useState } from 'react';
import { LuX, LuImagePlus, LuEllipsisVertical, LuSearch } from 'react-icons/lu';
import { pickFile, processImage } from './util.js';

export function Modal({ title, sub, onClose, children, footer, width = 560 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ width }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭"><LuX /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, text, okText = '确定', danger, onOk, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={420}
      footer={<>
        <button className="btn" onClick={onClose}>取消</button>
        <button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { onOk(); onClose(); }}>{okText}</button>
      </>}>
      <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>{text}</p>
    </Modal>
  );
}

export function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="更多"><LuEllipsisVertical /></button>
      {open && (
        <div className="menu">
          {items.filter(Boolean).map((it, i) => it === '-' ? <div key={i} className="menu-sep" /> : (
            <button key={i} className={'menu-item' + (it.danger ? ' danger' : '')} disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageBox({ value, onChange, size = 64, keepAlpha = false, maxSize = 900, label = '上传图片' }) {
  const choose = async () => {
    const f = await pickFile();
    if (!f) return;
    onChange(await processImage(f, { keepAlpha, maxSize }));
  };
  return (
    <div className={'imgbox' + (value ? ' has' : '')} style={{ width: size, height: size }} onClick={choose} title={value ? '点击更换图片' : label}>
      {value ? <img src={value} alt="" /> : <span className="imgbox-empty"><LuImagePlus /><em>{size > 70 ? label : ''}</em></span>}
      {value && (
        <button className="imgbox-del" title="移除图片" onClick={(e) => { e.stopPropagation(); onChange(''); }}><LuX /></button>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, autoFocus, style }) {
  return (
    <label className="search" style={style}>
      <LuSearch />
      <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="search-clear" onClick={() => onChange('')}><LuX /></button>}
    </label>
  );
}

export function Field({ label, children, hint, span }) {
  return (
    <label className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {text && <div className="muted">{text}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export const STATUS = {
  draft: { label: '草稿', cls: 'pill-gray' },
  sent: { label: '已发送', cls: 'pill-purple' },
  won: { label: '已成交', cls: 'pill-green' },
  lost: { label: '已失效', cls: 'pill-red' },
};
export const Pill = ({ status }) => {
  const s = STATUS[status] || STATUS.draft;
  return <span className={'pill ' + s.cls}>{s.label}</span>;
};
