import { initDb, persistDb as browserPersistDb } from '@blueteam-emu/browser-db';
import type { DbHandle } from '@blueteam-emu/browser-db';

/** Wasm URL: in production use the /BlueTeam-EMU base, in dev use the raw path. */
const WASM_URL =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/BlueTeam-EMU')
    ? '/BlueTeam-EMU/sql-wasm.wasm'
    : '/sql-wasm.wasm';

let dbHandle: DbHandle | undefined;
let hydrationDone: Promise<void> | null = null;

/** Get (or initialize) the shared database handle. */
export async function getDb(): Promise<DbHandle> {
  if (!dbHandle) {
    dbHandle = await initDb({ wasmUrl: WASM_URL });
  }
  return dbHandle;
}

/** Wait for hydration to complete before querying. */
export async function waitForHydration(): Promise<void> {
  if (hydrationDone) await hydrationDone;
}

/** Mark hydration as complete. Called by boot.ts after hydrateContent(). */
export function markHydrationDone(): void {
  if (!hydrationDone) {
    hydrationDone = Promise.resolve();
  }
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
