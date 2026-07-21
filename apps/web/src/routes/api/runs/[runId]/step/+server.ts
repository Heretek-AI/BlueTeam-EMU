import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '$lib/server/db/client.js';
import { runs, stepSubmissions, operations } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

const Body = z.object({
  stepId: z.string(),
  verdict: z.enum(['tp', 'fp', 'benign']).nullable(),
  note: z.string().default(''),
  mitreTags: z.array(z.string()).default([]),
  hintsUsed: z.number().int().nonnegative().default(0),
  startedAt: z.number().optional()
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const body = Body.parse(await request.json());
  const db = getDb();
  const runId = params.runId!;
  const r0 = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, locals.userId)));
  if (r0.length === 0) throw error(404, 'run not found');
  const r = r0[0]!;
  if (r.status === 'completed') throw error(400, 'run is completed');

  // Step gating: cannot submit step N+1 without prior verdict.
  const op = await db.select().from(operations).where(eq(operations.id, r.operationId));
  if (op.length === 0) throw error(404, 'operation not found');
  const opJson = JSON.parse(op[0]!.payload);
  const stepIdx = opJson.steps.findIndex((s: any) => s.id === body.stepId);
  if (stepIdx < 0) throw error(400, 'unknown step id');
  if (stepIdx > 0) {
    const prevStepId: string = opJson.steps[stepIdx - 1].id;
    const prevSubs = await db
      .select()
      .from(stepSubmissions)
      .where(and(eq(stepSubmissions.runId, runId), eq(stepSubmissions.stepId, prevStepId)));
    const ok = prevSubs.some((s) => s.verdict !== null);
    if (!ok) throw error(409, `must submit prior step ${prevStepId} first`);
  }

  const id = `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(stepSubmissions).values({
    id,
    runId,
    stepId: body.stepId,
    verdict: body.verdict,
    note: body.note,
    mitreTags: JSON.stringify(body.mitreTags),
    hintsUsed: body.hintsUsed,
    startedAt: body.startedAt ?? Date.now(),
    submittedAt: Date.now()
  });
  await db
    .update(runs)
    .set({ currentStepId: body.stepId })
    .where(eq(runs.id, runId));
  return json({ id });
};
