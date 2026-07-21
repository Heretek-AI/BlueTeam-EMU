import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client.js';
import { runs, operations } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const body = (await request.json().catch(() => ({}))) as {
    hintsUsed?: number;
  };
  const db = getDb();
  const op = await db.select().from(operations).where(eq(operations.id, params.id!));
  if (op.length === 0) throw error(404, 'operation not found');
  // Ensure prerequisites (existing passed runs at gating threshold for
  // any containing track). For v1, we just verify operation.prerequisites
  // are recorded as prior completed runs above their track thresholds.
  // To keep this MVP honest, refuse if a prerequisite is referenced and
  // there is no prior completed run for it.
  const prerequisites: string[] = JSON.parse(op[0]!.payload)?.prerequisites ?? [];
  if (prerequisites.length > 0) {
    const passed = await db
      .select()
      .from(runs)
      .where(eq(runs.userId, locals.userId));
    for (const prereq of prerequisites) {
      const ok = passed.some(
        (r) => r.operationId === prereq && r.status === 'completed'
      );
      if (!ok) throw error(403, `prerequisite not passed: ${prereq}`);
    }
  }

  const id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(runs).values({
    id,
    userId: locals.userId,
    operationId: params.id!,
    status: 'active',
    currentStepId: null,
    startedAt: Date.now(),
    hintsUsedTotal: body.hintsUsed ?? 0
  });
  return json({ id });
};

export const GET: RequestHandler = async ({ params, locals }) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(runs)
    .where(eq(runs.userId, locals.userId));
  return json({
    runs: rows.filter((r) => r.operationId === params.id)
  });
};
