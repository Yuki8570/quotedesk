import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuFileText, LuLayoutTemplate, LuPackage, LuPalette, LuDatabase, LuChevronLeft, LuPlus, LuCircleHelp, LuSearch,
} from 'react-icons/lu';
import { StoreProvider, useStore } from './store.jsx';
import { Confirm } from './ui.jsx';
import Quotes, { NewQuoteModal } from './pages/Quotes.jsx';
import Products from './pages/Products.jsx';
import Brands from './pages/Brands.jsx';
import Templates from './pages/Templates.jsx';
import Editor from './pages/Editor.jsx';
import Data from './pages/Data.jsx';

const NAV = [
  { group: '业务' },
  { key: 'quotes', label: '报价单', icon: <LuFileText /> },
  { key: 'templates', label: '常用模板', icon: <LuLayoutTemplate /> },
  { group: '基础数据' },
  { key: 'products', label: '产品库', icon: <LuPackage /> },
  { key: 'brands', label: '品牌抬头', icon: <LuPalette /> },
  { group: '系统' },
  { key: 'data', label: '数据备份', icon: <LuDatabase /> },
];
const TITLES = { quotes: '报价单', templates: '常用模板', products: '产品库', brands: '品牌抬头', data: '数据备份', editor: '编辑' };

function parseHash() {
  const [, page = 'quotes', kind, id] = location.hash.replace(/^#/, '').split('/');
  if (page === 'editor' && kind && id) return { page, params: { kind, id } };
  return { page: TITLES[page] && page !== 'editor' ? page : 'quotes', params: {} };
}

function Shell() {
  const { data } = useStore();
  const [route, setRoute] = useState(parseHash);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const guardRef = useRef(null);
  const setGuard = useCallback((g) => { guardRef.current = g; }, []);

  const doGo = useCallback((page, params = {}) => {
    setQuery('');
    setRoute({ page, params, key: Date.now() });
    const h = page === 'editor' ? `#/editor/${params.kind}/${params.id || params.draft?.id}` : `#/${page}`;
    if (location.hash !== h) history.pushState(null, '', h);
  }, []);
  const go = useCallback((page, params) => {
    if (guardRef.current && guardRef.current()) setPending({ page, params });
    else doGo(page, params);
  }, [doGo]);

  useEffect(() => {
    const h = () => {
      const r = parseHash();
      // 新建的草稿刷新后不存在，回到列表
      setRoute({ ...r, key: Date.now() });
    };
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);

  if (!data) return <div className="boot">正在加载…</div>;
  const { page, params } = route;
  const navKey = page === 'editor' ? (params.kind === 'template' ? 'templates' : 'quotes') : page;

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (page === 'editor' ? ' in-editor' : '')}>
      <aside className="side">
        <div className="side-brand">
          <div className="side-logo">报</div>
          <span className="side-name">QuoteDesk<small>报价单系统</small></span>
          <button className="collapse" onClick={() => setCollapsed((c) => !c)} title="收起/展开"><LuChevronLeft /></button>
        </div>
        <div className="side-org">
          <div className="org-ico">销</div>
          <div className="side-org-text"><div className="strong">销售部</div><div className="muted sm">内部演示版 · 本地存储</div></div>
        </div>
        <nav>
          {NAV.map((n, i) => n.group
            ? <div key={i} className="nav-group">{n.group}</div>
            : (
              <button key={n.key} className={'nav' + (navKey === n.key ? ' on' : '')} onClick={() => go(n.key)} title={n.label}>
                {n.icon}<span>{n.label}</span>
                {n.key === 'quotes' && <em>{data.quotes.length}</em>}
                {n.key === 'products' && <em>{data.products.length}</em>}
              </button>
            ))}
        </nav>
        <div className="side-foot">
          <div className="nav-hint"><LuCircleHelp /><span>Excel 导出严格基于原始模板生成</span></div>
        </div>
      </aside>

      <main className="main">
        {page !== 'editor' && (
          <header className="top">
            <h1>{TITLES[page]}</h1>
            <label className="top-search">
              <LuSearch />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="在当前页面中搜索…" />
            </label>
            <button className="fab" title="新建报价单" onClick={() => setNewOpen(true)}><LuPlus /></button>
            <div className="top-sep" />
            <div className="user">
              <div className="avatar">销</div>
              <div><div className="strong">销售部</div><div className="muted sm">管理员</div></div>
            </div>
          </header>
        )}
        <div className="content" key={route.key}>
          {page === 'quotes' && <Quotes query={query} setQuery={setQuery} go={go} />}
          {page === 'templates' && <Templates query={query} setQuery={setQuery} go={go} />}
          {page === 'products' && <Products query={query} setQuery={setQuery} />}
          {page === 'brands' && <Brands />}
          {page === 'data' && <Data />}
          {page === 'editor' && <Editor kind={params.kind} id={params.id} draft={params.draft} go={go} setGuard={setGuard} />}
        </div>
      </main>

      {page !== 'editor' && (
        <nav className="m-tabbar">
          {NAV.filter((n) => n.key).map((n) => (
            <button key={n.key} className={navKey === n.key ? 'on' : ''} onClick={() => go(n.key)}>
              {n.icon}<span>{n.label.replace('品牌', '')}</span>
            </button>
          ))}
        </nav>
      )}
      {newOpen && <NewQuoteModal onClose={() => setNewOpen(false)} go={go} />}
      {pending && (
        <Confirm title="有未保存的修改" text="离开后本次修改将丢失，确定离开吗？" okText="不保存，离开" danger
          onOk={() => { guardRef.current = null; doGo(pending.page, pending.params); }} onClose={() => setPending(null)} />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StoreProvider><Shell /></StoreProvider>);
