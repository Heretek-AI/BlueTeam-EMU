/**
 * Storage backends for the sql.js database image.
 *
 * The browser backend uses IndexedDB; the memory backend is for
 * tests and Node-side tooling. Both satisfy the same interface.
 */

export interface StorageBackend {
  /** Returns the serialized database, or null when absent. */
  load(): Promise<Uint8Array | null>;
  /** Persists the serialized database. */
  save(data: Uint8Array): Promise<void>;
  /** Deletes any persisted copy. */
  clear(): Promise<void>;
}

const IDB_NAME = 'blueteam-emu';
const IDB_STORE = 'kv';
const IDB_KEY = 'sqlite-db';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, mode);
    const req = fn(tx.objectStore(IDB_STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IdbBackend implements StorageBackend {
  async load(): Promise<Uint8Array | null> {
    if (typeof indexedDB === 'undefined') return null;
    const db = await openIdb();
    try {
      const v = await idbTx(db, 'readonly', (s) => s.get(IDB_KEY));
      if (v instanceof Uint8Array) return v;
      if (v instanceof ArrayBuffer) return new Uint8Array(v);
      return null;
    } finally {
      db.close();
    }
  }

  async save(data: Uint8Array): Promise<void> {
    const db = await openIdb();
    try {
      await idbTx(db, 'readwrite', (s) => s.put(data, IDB_KEY));
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    const db = await openIdb();
    try {
      await idbTx(db, 'readwrite', (s) => s.delete(IDB_KEY));
    } finally {
      db.close();
    }
  }
}

export class MemoryBackend implements StorageBackend {
  private data: Uint8Array | null = null;
  async load(): Promise<Uint8Array | null> {
    return this.data;
  }
  async save(data: Uint8Array): Promise<void> {
    this.data = data;
  }
  async clear(): Promise<void> {
    this.data = null;
  }
}

export function defaultBackend(): StorageBackend {
  if (typeof indexedDB !== 'undefined') return new IdbBackend();
  return new MemoryBackend();
}
