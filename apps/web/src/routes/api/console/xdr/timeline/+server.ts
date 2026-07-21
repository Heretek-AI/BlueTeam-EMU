import { json, error } from '@sveltejs/kit';
import { and, eq, asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { events } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as {
    operationId?: string;
    host?: string;
    kinds?: string[];
    limit?: number;
  };
  if (!body.operationId || !body.host) throw error(400, 'operationId and host required');
  const db = getDb();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.operationId, body.operationId), eq(events.host, body.host)))
    .orderBy(asc(events.ts));
  const kinds = new Set(body.kinds ?? ['process', 'file', 'auth', 'network']);
  const timeline = rows
    .filter((r) => kinds.has(r.kind))
    .slice(0, body.limit ?? 500);
  return json({ events: timeline });
};
