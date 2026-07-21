import { getDb } from '$lib/server/db/client.js';
import { tracks, trackOperations, operations, runs, trackCompletions } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  const db = getDb();
  const t = await db.select().from(tracks).where(eq(tracks.id, params.id!));
  if (t.length === 0) throw error(404, 'track missing');
  const links = await db
    .select()
    .from(trackOperations)
    .where(eq(trackOperations.trackId, params.id!));
  const ops = await db.select().from(operations);
  const ordered = links
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((l) => {
      const op = ops.find((o) => o.id === l.operationId);
      return { ...l, op };
    });
  const completedIds = (
    await db.select().from(trackCompletions).where(eq(trackCompletions.userId, locals.userId))
  )
    .filter((c) => c.trackId === params.id)
    .map((c) => c.trackId);
  const myRuns = await db.select().from(runs).where(eq(runs.userId, locals.userId));
  const bestScoreByOp = new Map<string, number>();
  for (const r of myRuns) {
    if (r.status !== 'completed') continue;
    bestScoreByOp.set(r.operationId, Math.max(bestScoreByOp.get(r.operationId) ?? 0, t[0]!.threshold + 1));
  }
  return {
    track: t[0]!,
    operations: ordered,
    trackCompleted: completedIds.length > 0,
    threshold: t[0]!.threshold,
    bestScoreByOp: Object.fromEntries(bestScoreByOp)
  };
};
