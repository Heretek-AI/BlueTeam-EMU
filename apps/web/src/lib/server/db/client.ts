import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema.js';

let _db: ReturnType<typeof drizzle> | undefined;

function dbPath() {
  const url = process.env.DATABASE_URL ?? './data/app.db';
  return path.resolve(process.cwd(), url);
}

export function getDb() {
  if (_db) return _db;
  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  _db = drizzle(sqlite, { schema });
  return _db;
}

export function closeDb() {
  // better-sqlite3 is reference-counted via the wrapper; clear cache.
  _db = undefined;
}
