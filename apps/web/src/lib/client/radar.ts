import { getDb } from './db.js';
import { scoreRun, aggregateRadar, type RunRecord } from '@blueteam-emu/grading';
import type { Axis, AggregateResult } from '@blueteam-emu/grading';

/**
 * Compute radar aggregates for the local user from the browser database.
 * Calls the pure aggregation functions from @blueteam-emu/grading.
 */
export async function getUserRadar(): Promise<{
  byOperation: Record<string, AggregateResult>;
  byTrack: Record<string, AggregateResult>;
  user: AggregateResult;
}> {
  const h = await getDb();

  // Build a run record builder
  function buildRunRecord(dbRow: any, opPayload: any): RunRecord {
    const stepMap = new Map<string, any>((opPayload?.steps ?? []).map((s: any) => [s.id, s]));
    const subsRes = h.db.exec(
      `SELECT step_id, verdict, note, mitre_tags, hints_used, started_at, submitted_at
       FROM step_submissions WHERE run_id = ? ORDER BY submitted_at ASC`,
      [dbRow.id]
    );
    const submissions = (subsRes[0]?.values ?? []).map((row: any) => {
      const cfg = stepMap.get(row[0]);
      return {
        stepId: row[0],
        verdict: row[1],
        note: row[2] ?? '',
        mitreTags: JSON.parse(row[3] ?? '[]'),
        hintsUsed: row[4] ?? 0,
        startedAt: row[5],
        submittedAt: row[6],
        expectedVerdict: cfg?.expected_verdict,
        expectedMitre: cfg?.expected_mitre ?? [],
        expectedIndicators: cfg?.expected_indicators ?? [],
        hintsPenaltyPercent: cfg?.hint_penalty_percent ?? 10,
        consolesTouched: ['siem'],
        stepBudgetSeconds: 60
      };
    });
    return {
      id: dbRow.id,
      operationId: dbRow.operation_id,
      startedAt: dbRow.started_at,
      completedAt: dbRow.completed_at,
      finalMitre: JSON.parse(dbRow.final_mitre ?? '[]'),
      hintsUsedTotal: submissions.reduce((a: number, s: any) => a + s.hintsUsed, 0),
      hintPenaltiesApplied: 0,
      uniqueConsoles: new Set<string>(),
      submissions
    };
  }

  // All runs
  const runRes = h.db.exec(
    `SELECT r.id, r.operation_id, r.started_at, r.completed_at, r.final_mitre, o.payload
     FROM runs r JOIN operations o ON r.operation_id = o.id
     WHERE r.user_id = 'local'`
  );
  const runsByOp = new Map<string, RunRecord[]>();
  const opPayloads = new Map<string, any>();
  for (const row of runRes[0]?.values ?? []) {
    const opId = row[1] as string;
    const payload = JSON.parse(row[5] as string);
    opPayloads.set(opId, payload);
    if (!runsByOp.has(opId)) runsByOp.set(opId, []);
    runsByOp.get(opId)!.push(buildRunRecord({ id: row[0], operation_id: opId, started_at: row[2], completed_at: row[3], final_mitre: row[4] }, payload));
  }

  // Operations by track
  const trackOpsRes = h.db.exec(
    `SELECT track_id, operation_id FROM track_operations ORDER BY order_index ASC`
  );
  const opsByTrack = new Map<string, string[]>();
  for (const row of trackOpsRes[0]?.values ?? []) {
    const [tid, oid] = row as [string, string];
    if (!opsByTrack.has(tid)) opsByTrack.set(tid, []);
    opsByTrack.get(tid)!.push(oid);
  }

  // Tracks by user
  const allTrackIds = h.db.exec(`SELECT id FROM tracks`);
  const tracksByUser = new Map<string, string[]>();
  tracksByUser.set('local', (allTrackIds[0]?.values ?? []).map((r: any) => r[0]));

  const input = {
    runsByOperation: runsByOp,
    operationsByTrack: opsByTrack,
    tracksByUser
  };

  const result = aggregateRadar(input);

  const byOperation: Record<string, AggregateResult> = {};
  for (const [k, v] of result.byOperation) byOperation[k] = v;
  const byTrack: Record<string, AggregateResult> = {};
  for (const [k, v] of result.byTrack) byTrack[k] = v;
  const user = result.byUser.get('local') ?? {
    scope: 'user' as const,
    perAxis: { speed: 0, accuracy: 0, correlation: 0, methodology: 0, detectionCoverage: 0, documentation: 0, timeToFirstAction: 0, pressure: 0 },
    composite: 0,
    count: 0
  };

  return { byOperation, byTrack, user };
}
