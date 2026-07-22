import { initDb, persistDb } from '@blueteam-emu/browser-db';
import type { DbHandle } from '@blueteam-emu/browser-db';

/** Wasm URL: in production use the /BlueTeam-EMU base, in dev use the raw path. */
const WASM_URL = typeof window !== 'undefined' && window.location.pathname.startsWith('/BlueTeam-EMU')
  ? '/BlueTeam-EMU/sql-wasm.wasm'
  : '/sql-wasm.wasm';

let dbHandle: DbHandle | undefined;

/** Get (or initialize) the shared database handle. */
export async function getDb(): Promise<DbHandle> {
  if (!dbHandle) {
    dbHandle = await initDb({ wasmUrl: WASM_URL });
  }
  return dbHandle;
}

/** Convenience wrapper for writes that auto-persist. */
export async function withPersistence<T>(fn: (db: import('sql.js').Database) => T | Promise<T>): Promise<T> {
  const h = await getDb();
  const out = await fn(h.db);
  await persistDb(h);
  return out;
}
