import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { db } from './db.js';
import { seedData, uid } from './seed.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);
const KEYS = ['products', 'brands', 'quotes', 'templates'];

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const dataRef = useRef(null);
  dataRef.current = data;

  const load = useCallback(async () => {
    const seeded = await db.getMeta('seeded');
    if (!seeded) {
      const s = seedData();
      for (const k of KEYS) await db.bulk(k, s[k]);
      await db.setMeta('seeded', true);
    }
    const out = {};
    for (const k of KEYS) out[k] = await db.all(k);
    setData(out);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toast = useCallback((msg, type = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const save = useCallback(async (store, obj) => {
    const rec = { ...obj, id: obj.id || uid(), updatedAt: Date.now(), createdAt: obj.createdAt || Date.now() };
    await db.put(store, rec);
    setData((d) => {
      const list = d[store];
      const i = list.findIndex((x) => x.id === rec.id);
      const next = i >= 0 ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec];
      return { ...d, [store]: next };
    });
    return rec;
  }, []);

  const remove = useCallback(async (store, id) => {
    await db.del(store, id);
    setData((d) => ({ ...d, [store]: d[store].filter((x) => x.id !== id) }));
  }, []);

  const replaceAll = useCallback(async (payload, mode = 'replace') => {
    for (const k of KEYS) {
      if (!Array.isArray(payload[k])) continue;
      if (mode === 'replace') await db.clear(k);
      await db.bulk(k, payload[k]);
    }
    await db.setMeta('seeded', true);
    const out = {};
    for (const k of KEYS) out[k] = await db.all(k);
    setData(out);
  }, []);

  const resetDemo = useCallback(async () => {
    const s = seedData();
    await replaceAll(s, 'replace');
  }, [replaceAll]);

  const value = { data, save, remove, toast, replaceAll, resetDemo, getData: () => dataRef.current };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export const defaultBrand = (brands) => brands.find((b) => b.isDefault) || brands[0];
