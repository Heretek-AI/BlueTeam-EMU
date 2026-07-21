import { getDb } from '$lib/server/db/client.js';
import { operations, runs } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  const db = getDb();
  const opRows = await db.select().from(operations).where(eq(operations.id, params.id!));
  if (opRows.length === 0) throw error(404, 'operation missing');
  const op = opRows[0]!;
  const myRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.userId, locals.userId), eq(runs.operationId, params.id!)));
  return {
    operation: op,
    payload: JSON.parse(op.payload),
    runs: myRuns
  };
};
