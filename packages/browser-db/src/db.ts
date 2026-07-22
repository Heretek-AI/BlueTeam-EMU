import initSqlJs, { type Database } from 'sql.js';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.js';
import { defaultBackend, type StorageBackend } from './storage.js';

export interface DbHandle {
  db: Database;
  backend: StorageBackend;
}

export interface InitOptions {
  backend?: StorageBackend;
  /** URL (or Node path) used to resolve `sql-wasm.wasm`. */
  wasmUrl?: string;
}

let singleton: Promise<DbHandle> | null = null;

async function boot(opts: InitOptions): Promise<DbHandle> {
  const backend = opts.backend ?? defaultBackend();
  const SQL = await initSqlJs(
    opts.wasmUrl
      ? { locateFile: () => opts.wasmUrl! }
      : undefined
  );
  const existing = await backend.load();
  const db = existing ? new SQL.Database(existing) : new SQL.Database();
  if (!existing) {
    db.run(SCHEMA_SQL);
    db.run(
      `INSERT INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`
    );
    await backend.save(new Uint8Array(db.export()));
  } else {
    migrate(db);
  }
  // foreign_keys is a per-connection pragma — must be set on every open AFTER schema.
  db.run('PRAGMA foreign_keys = ON');
  return { db, backend };
}

/**
 * Idempotent schema migrations. Reads `meta.schema_version` and
 * applies forward-only ALTERs. Never destroys data.
 */
export function migrate(db: Database): void {
  const res = db.exec(`SELECT value FROM meta WHERE key = 'schema_version'`);
  const current =
    res.length > 0 && res[0]!.values.length > 0
      ? Number(res[0]!.values[0]![0])
      : 0;
  if (current >= SCHEMA_VERSION) return;
  // Future migrations go here as `if (current < 2) { ... }`.
  db.run(
    `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(SCHEMA_VERSION)]
  );
}

/** Initialize (or reuse) the shared database handle. */
export async function initDb(opts: InitOptions = {}): Promise<DbHandle> {
  if (!singleton) singleton = boot(opts);
  return singleton;
}

/** Persist the in-memory database to the storage backend. */
export async function persistDb(h: DbHandle): Promise<void> {
  await h.backend.save(new Uint8Array(h.db.export()));
}

/**
 * Convenience wrapper: run `fn` against the shared database and
 * persist afterwards when the call succeeds.
 */
export async function withDb<T>(
  fn: (db: Database) => T | Promise<T>,
  opts: InitOptions = {}
): Promise<T> {
  const h = await initDb(opts);
  const out = await fn(h.db);
  await persistDb(h);
  return out;
}

/** Delete the persisted database and reset the singleton. */
export async function clearAllData(opts: InitOptions = {}): Promise<void> {
  const h = await initDb(opts);
  await h.backend.clear();
  singleton = null;
}

/** Test hook: drop the cached singleton without touching storage. */
export function _resetSingletonForTests(): void {
  singleton = null;
}
