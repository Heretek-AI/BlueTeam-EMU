import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { runs } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
  const db = getDb();
  const runId = params.runId!;
  const existing = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, locals.userId)));
  if (existing.length === 0) throw error(404, 'run not found');
  const r = existing[0]!;
  if (r.status !== 'active') throw error(400, `run is ${r.status}`);
  await db.update(runs).set({ status: 'paused' }).where(eq(runs.id, runId));
  return json({ ok: true });
};
