import { getDb, withPersistence } from './db.js';
import type { DbHandle } from '@blueteam-emu/browser-db';

export interface Filter {
  field: string;
  value: string;
}

export interface SearchResult {
  id: string;
  ts: number;
  source: string;
  kind: string;
  host: string | null;
  user: string | null;
  process: string | null;
  pid: number | null;
  suspicious: boolean;
  payload: any;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  lastRunAt: number;
}

export async function searchLogs(opts: {
  operationId: string;
  filters?: Filter[];
  limit?: number;
}): Promise<{ events: SearchResult[]; total: number }> {
  const limit = Math.min(opts.limit ?? 200, 1000);
  const h = await getDb();

  let sql = `SELECT id, ts, source, kind, host, user, process, pid, suspicious, payload FROM events WHERE operation_id = ?`;
  const params: any[] = [opts.operationId];

  if (opts.filters && opts.filters.length > 0) {
    for (const f of opts.filters) {
      if (['host', 'user', 'process', 'source', 'kind'].includes(f.field)) {
        sql += ` AND ${f.field} = ?`;
        params.push(f.value);
      } else {
        sql += ` AND json_extract(payload, '$.fields.${f.field}') = ?`;
        params.push(f.value);
      }
    }
  }

  sql += ` ORDER BY ts ASC LIMIT ?`;
  params.push(limit);

  const res = h.db.exec(sql, params);
  const events: SearchResult[] = (res[0]?.values ?? []).map((row: any) => ({
    id: row[0],
    ts: row[1],
    source: row[2],
    kind: row[3],
    host: row[4],
    user: row[5],
    process: row[6],
    pid: row[7],
    suspicious: row[8] === 1,
    payload: JSON.parse(row[9] ?? '{}')
  }));

  return { events, total: events.length };
}

const SAVED_CAP = 50;

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const h = await getDb();
  const res = h.db.exec(`SELECT id, name, query, last_run_at FROM saved_searches ORDER BY last_run_at DESC`);
  return (res[0]?.values ?? []).map((row: any) => ({
    id: row[0],
    name: row[1],
    query: row[2],
    lastRunAt: row[3]
  }));
}

export async function createSavedSearch(name: string, query: unknown): Promise<string> {
  return withPersistence(async (h) => {
    const existing = h.exec(`SELECT COUNT(*) FROM saved_searches`);
    if (Number(existing[0]?.values?.[0]?.[0] ?? 0) >= SAVED_CAP) throw new Error('saved search cap reached');
    const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    h.run(
      `INSERT INTO saved_searches (id, user_id, name, query, last_run_at) VALUES (?, 'local', ?, ?, ?)`,
      [id, name.slice(0, 80), JSON.stringify(query), now]
    );
    return id;
  });
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await withPersistence(async (h) => {
    h.run(`DELETE FROM saved_searches WHERE id = ?`, [id]);
  });
}
