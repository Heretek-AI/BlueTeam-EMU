import { getDb, withPersistence } from './db.js';

export interface TrackInfo {
  id: string;
  title: string;
  summary: string;
  difficulty: string;
  threshold: number;
  operationIds: string[];
}

export async function listTracks(): Promise<TrackInfo[]> {
  const h = await getDb();
  const res = h.db.exec(`SELECT id, title, summary, difficulty, threshold, payload FROM tracks`);
  return (res[0]?.values ?? []).map((row: any) => {
    const payload = JSON.parse(row[5] ?? '{}');
    return {
      id: row[0],
      title: row[1],
      summary: row[2],
      difficulty: row[3],
      threshold: row[4],
      operationIds: payload.operation_ids ?? []
    };
  });
}

export interface TrackDetail {
  track: TrackInfo;
  operations: Array<{ id: string; title: string }>;
  enrolled: boolean;
  completed: boolean;
  gatingState: Map<string, boolean>;
}

export async function getTrackDetail(trackId: string): Promise<TrackDetail> {
  const h = await getDb();
  const trackRes = h.db.exec(
    `SELECT id, title, summary, difficulty, threshold, payload FROM tracks WHERE id = ?`,
    [trackId]
  );
  if (trackRes.length === 0 || trackRes[0]!.values.length === 0) throw new Error('track not found');
  const row = trackRes[0]!.values[0]! as any[];
  const payload = JSON.parse(row[5] ?? '{}');

  const track: TrackInfo = {
    id: row[0],
    title: row[1],
    summary: row[2],
    difficulty: row[3],
    threshold: row[4],
    operationIds: payload.operation_ids ?? []
  };

  // Load operations
  const ops: Array<{ id: string; title: string }> = [];
  const trackOps = h.db.exec(
    `SELECT o.id, o.title FROM operations o
     JOIN track_operations tro ON o.id = tro.operation_id
     WHERE tro.track_id = ? ORDER BY tro.order_index ASC`,
    [trackId]
  );
  for (const r of trackOps[0]?.values ?? []) {
    ops.push({ id: r[0] as string, title: r[1] as string });
  }

  const enrolledRes = h.db.exec(
    `SELECT COUNT(*) FROM enrollments WHERE user_id = 'local' AND track_id = ?`,
    [trackId]
  );
  const enrolled = Number(enrolledRes[0]?.values?.[0]?.[0] ?? 0) > 0;

  const completedRes = h.db.exec(
    `SELECT COUNT(*) FROM track_completions WHERE user_id = 'local' AND track_id = ?`,
    [trackId]
  );
  const completed = Number(completedRes[0]?.values?.[0]?.[0] ?? 0) > 0;

  // Gating: which operations are passed?
  const gatingState = new Map<string, boolean>();
  for (const opId of track.operationIds) {
    const passed = h.db.exec(
      `SELECT COUNT(*) FROM runs WHERE operation_id = ? AND user_id = 'local' AND status = 'completed'`,
      [opId]
    );
    gatingState.set(opId, Number(passed[0]?.values?.[0]?.[0] ?? 0) > 0);
  }

  return { track, operations: ops, enrolled, completed, gatingState };
}

export async function enroll(trackId: string): Promise<void> {
  await withPersistence(async (h) => {
    h.run(
      `INSERT OR IGNORE INTO enrollments (user_id, track_id) VALUES ('local', ?)`,
      [trackId]
    );
  });
}
