'use strict';
/* ===== IndexedDB storage with an in-memory cache =====
   All records are loaded into memory on start (fast lookups),
   and every save is written straight through to IndexedDB. */
const DB = (() => {
  const NAME = 'it_solar_crm', VER = 2;
  const STORES = ['meta', 'users', 'customers', 'leads', 'jobcards', 'surveys', 'items', 'stockMoves', 'vendors', 'purchases',
    'quotes', 'invoices', 'assets', 'amcs', 'tickets', 'fieldJobs', 'attendance', 'packages', 'rma', 'expenses', 'licenses'];
  let db; const cache = {};

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => { const d = r.result; STORES.forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
      r.onsuccess = () => { db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  }
  function tx(s, fn) {
    return new Promise((res, rej) => {
      const t = db.transaction(s, 'readwrite'); fn(t.objectStore(s));
      t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  function loadAll() {
    return Promise.all(STORES.map(s => new Promise((res, rej) => {
      const q = db.transaction(s).objectStore(s).getAll();
      q.onsuccess = () => { cache[s] = q.result; res(); }; q.onerror = () => rej(q.error);
    })));
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  return {
    STORES,
    async init() { await open(); await loadAll(); },
    all: s => cache[s] || [],
    get: (s, id) => (cache[s] || []).find(x => x.id === id),
    find: (s, f) => (cache[s] || []).find(f),
    where: (s, f) => (cache[s] || []).filter(f),
    async put(s, obj) {
      if (!obj.id) obj.id = uid(s.slice(0, 2) + '_');
      const copy = clone(obj);
      const i = cache[s].findIndex(x => x.id === obj.id);
      if (i >= 0) cache[s][i] = obj; else cache[s].push(obj);
      try { await tx(s, st => st.put(copy)); } catch (e) { toast('Save failed: ' + e.message, 'err'); throw e; }
      return obj;
    },
    async del(s, id) { cache[s] = cache[s].filter(x => x.id !== id); await tx(s, st => st.delete(id)); },
    async bulk(s, arr) { await tx(s, st => arr.forEach(o => st.put(o))); cache[s] = (cache[s] || []).filter(x => !arr.some(a => a.id === x.id)).concat(arr); },
    async clearAll() { for (const s of STORES) { await tx(s, st => st.clear()); cache[s] = []; } },
    exportAll() { return { app: 'IT-Solar-CRM', version: VER, exportedAt: new Date().toISOString(), data: clone(cache) }; },
    async importAll(json) {
      if (!json || !json.data || !Array.isArray(json.data.users)) throw new Error('This is not a valid CRM backup file');
      await this.clearAll();
      for (const s of STORES) if (Array.isArray(json.data[s]) && json.data[s].length) await this.bulk(s, json.data[s]);
    },
    /* next running number like INV/2026-27/0007 */
    nextNo(store, prefix, field = 'no') {
      let max = 0;
      cache[store].forEach(x => { const m = String(x[field] || '').match(/(\d+)$/); if (m && String(x[field]).startsWith(prefix)) max = Math.max(max, +m[1]); });
      return prefix + String(max + 1).padStart(4, '0');
    },
  };
})();
