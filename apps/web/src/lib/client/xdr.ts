import { getDb } from './db.js';

export interface TimelineEvent {
  id: string;
  ts: number;
  source: string;
  kind: string;
  host: string | null;
  user: string | null;
  process: string | null;
  pid: number | null;
  ppid: number | null;
  suspicious: boolean;
  suspicionRule: string | null;
  payload: any;
}

export async function getEntityTimeline(opts: {
  operationId: string;
  host: string;
  kinds?: string[];
  limit?: number;
}): Promise<{ events: TimelineEvent[] }> {
  const h = await getDb();
  const kindFilter = (opts.kinds ?? ['process', 'file', 'auth', 'network'])
    .map(() => '?')
    .join(',');
  const params: any[] = [opts.operationId, opts.host, ...(opts.kinds ?? ['process', 'file', 'auth', 'network'])];
  const limit = Math.min(opts.limit ?? 500, 500);

  const res = h.db.exec(
    `SELECT id, ts, source, kind, host, user, process, pid, ppid, suspicious, suspicion_rule, payload
     FROM events WHERE operation_id = ? AND host = ? AND kind IN (${kindFilter})
     ORDER BY ts ASC LIMIT ?`,
    [...params, limit]
  );

  const events: TimelineEvent[] = (res[0]?.values ?? []).map((row: any) => ({
    id: row[0],
    ts: row[1],
    source: row[2],
    kind: row[3],
    host: row[4],
    user: row[5],
    process: row[6],
    pid: row[7],
    ppid: row[8],
    suspicious: row[9] === 1,
    suspicionRule: row[10],
    payload: JSON.parse(row[11] ?? '{}')
  }));

  return { events };
}
