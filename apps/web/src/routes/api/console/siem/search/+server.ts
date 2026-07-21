import { json, error } from '@sveltejs/kit';
import { and, eq, like, sql, type SQL } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { events } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

interface Filter {
  field: string;
  value: string;
}

function applyFilter(field: string, value: string): SQL {
  // Match against the `payload` JSON for fields not in their own columns.
  // For known columns, use indexed equality.
  const col = (
    { host: events.host, user: events.user, process: events.process, kind: events.kind, source: events.source } as Record<
      string,
      typeof events.host
    >
  )[field];
  if (col) return eq(col, value);
  return like(sql`json_extract(${events.payload}, '$.fields.${sql.raw(field)}')`, value);
}

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as {
    operationId?: string;
    filters?: Filter[];
    limit?: number;
  };
  if (!body.operationId) throw error(400, 'operationId required');
  let limit = body.limit ?? 200;
  if (limit > 1000) limit = 1000;
  if (limit < 1) limit = 1;

  const db = getDb();
  const filters = body.filters ?? [];
  const where = filters.length === 0
    ? eq(events.operationId, body.operationId)
    : and(eq(events.operationId, body.operationId), ...filters.map((f) => applyFilter(f.field, f.value)));

  const rows = await db
    .select()
    .from(events)
    .where(where)
    .orderBy(events.ts)
    .limit(limit);

  return json({
    events: rows.map((r) => ({
      id: r.id,
      ts: r.ts,
      source: r.source,
      kind: r.kind,
      host: r.host,
      user: r.user,
      process: r.process,
      pid: r.pid,
      suspicious: r.suspicious === 1,
      payload: JSON.parse(r.payload)
    })),
    total: rows.length
  });
};
