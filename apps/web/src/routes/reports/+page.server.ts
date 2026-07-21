import { getDb } from '$lib/server/db/client.js';
import { runs, operations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { scoreRun } from '@blueteam-emu/grading';

export const load = async ({ locals }) => {
  const db = getDb();
  const allRuns = await db.select().from(runs).where(eq(runs.userId, locals.userId));
  const allOps = await db.select().from(operations);
  const completed = allRuns.filter((r) => r.status === 'completed');

  // Build minimal RunRecord list; for v1, use a stub per-axis from the operation difficulty.
  const opDifficulty = (id: string) =>
    allOps.find((o) => o.id === id)?.difficulty ?? 'intermediate';
  const perAxisByOp = new Map<string, { perAxis: Record<string, number>; composite: number }>();
  for (const op of allOps) {
    // First real score from any completed run on that op:
    const runsForOp = completed.filter((r) => r.operationId === op.id);
    let agg = 50;
    if (runsForOp.length > 0) {
      const subs = await db
        .select()
        .from((await import('$lib/server/db/schema.js')).stepSubmissions)
        .where(eq((await import('$lib/server/db/schema.js')).stepSubmissions.runId, runsForOp[0]!.id));
      const opJson = JSON.parse(op.payload);
      const stepMap = new Map(opJson.steps.map((s: any) => [s.id, s]));
      const rr = {
        id: runsForOp[0]!.id,
        operationId: op.id,
        startedAt: runsForOp[0]!.startedAt,
        completedAt: runsForOp[0]!.completedAt ?? Date.now(),
        finalMitre: [],
        hintsUsedTotal: subs.reduce((acc: number, s: any) => acc + (s.hintsUsed ?? 0), 0),
        hintPenaltiesApplied: 0,
        uniqueConsoles: new Set<string>(),
        submissions: subs.map((s: any) => {
          const cfg = stepMap.get(s.stepId);
          return {
            stepId: s.stepId,
            verdict: s.verdict,
            note: s.note ?? '',
            mitreTags: JSON.parse(s.mitreTags ?? '[]'),
            startedAt: s.startedAt,
            submittedAt: s.submittedAt,
            hintsUsed: s.hintsUsed ?? 0,
            expectedVerdict: cfg?.expected_verdict,
            expectedMitre: cfg?.expected_mitre ?? [],
            expectedIndicators: cfg?.expected_indicators ?? [],
            hintsPenaltyPercent: cfg?.hint_penalty_percent ?? 10,
            consolesTouched: ['siem'],
            stepBudgetSeconds: 60
          };
        })
      };
      agg = scoreRun(rr as any).composite;
    }
    perAxisByOp.set(op.id, {
      perAxis: { speed: agg, accuracy: agg, correlation: agg, methodology: agg, detectionCoverage: agg, documentation: agg, timeToFirstAction: agg, pressure: agg },
      composite: agg
    });
  }

  // User aggregate: mean of all completed-run composites
  const allScores = [...perAxisByOp.values()].map((v) => v.composite);
  const userComposite = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;
  const perAxis = { speed: userComposite, accuracy: userComposite, correlation: userComposite, methodology: userComposite, detectionCoverage: userComposite, documentation: userComposite, timeToFirstAction: userComposite, pressure: userComposite };

  return {
    perAxis,
    composite: userComposite,
    perAxisByOp: Object.fromEntries(perAxisByOp)
  };
};
