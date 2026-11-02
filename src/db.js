// 浏览器本地存储（IndexedDB）。后期接入服务器时，只需替换本文件为 API 调用。
const DB_NAME = 'quote-studio';
const STORES = ['products', 'brands', 'quotes', 'templates', 'meta'];
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  return dbp;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  }));
}

export const db = {
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  put: (store, obj) => tx(store, 'readwrite', (s) => { s.put(obj); }),
  del: (store, id) => tx(store, 'readwrite', (s) => { s.delete(id); }),
  clear: (store) => tx(store, 'readwrite', (s) => { s.clear(); }),
  async bulk(store, list) {
    return tx(store, 'readwrite', (s) => { list.forEach((o) => s.put(o)); });
  },
  async getMeta(key) {
    const all = await db.all('meta');
    return all.find((m) => m.id === key)?.value;
  },
  setMeta: (key, value) => db.put('meta', { id: key, value }),
};
