import { initDb, persistDb as browserPersistDb } from '@blueteam-emu/browser-db';
import type { DbHandle } from '@blueteam-emu/browser-db';
import { isHydrated } from './hydration.js';

/** Wasm URL: in production use the /BlueTeam-EMU base, in dev use the raw path. */
const WASM_URL =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/BlueTeam-EMU')
    ? '/BlueTeam-EMU/sql-wasm.wasm'
    : '/sql-wasm.wasm';

let dbHandle: DbHandle | undefined;

/**
 * Get the shared database handle.
 * Blocks until hydration completes so callers always get populated data.
 */
export async function getDb(): Promise<DbHandle> {
  if (!dbHandle) {
    dbHandle = await initDb({ wasmUrl: WASM_URL });
  }
  if (!isHydrated()) {
    // Wait for hydration to complete
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (isHydrated()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }
  return dbHandle;
}

/** Persist the current database state to IndexedDB. */
export async function persistDb(): Promise<void> {
  const h = await getDb();
  await browserPersistDb(h);
}

/** Convenience wrapper for writes that auto-persist. */
export async function withPersistence<T>(
  fn: (db: import('sql.js').Database) => T | Promise<T>,
): Promise<T> {
  const h = await getDb();
  const out = await fn(h.db);
  await browserPersistDb(h);
  return out;
}
