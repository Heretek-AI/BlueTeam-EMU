import { getDb, withPersistence } from './db.js';

export interface RunRecord {
  id: string;
  operationId: string;
  status: string;
  currentStepId: string | null;
  startedAt: number;
  completedAt: number | null;
  finalMitre: string[];
}

export async function startRun(operationId: string): Promise<RunRecord> {
  return withPersistence(async (h) => {
    // Check prerequisites
    const opRes = h.exec(`SELECT payload FROM operations WHERE id = ?`, [operationId]);
    if (opRes.length === 0 || opRes[0]!.values.length === 0) throw new Error('operation not found');
    const op = JSON.parse(opRes[0]!.values[0]![0] as string);
    const prerequisites: string[] = op.prerequisites ?? [];
    if (prerequisites.length > 0) {
      for (const prereq of prerequisites) {
        const done = h.exec(
          `SELECT COUNT(*) FROM runs WHERE operation_id = ? AND user_id = 'local' AND status = 'completed'`,
          [prereq]
        );
        if ((done[0]?.values?.[0]?.[0] ?? 0) === 0) {
          throw new Error(`prerequisite not passed: ${prereq}`);
        }
      }
    }

    const id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    h.run(
      `INSERT INTO runs (id, user_id, operation_id, status, started_at) VALUES (?, 'local', ?, 'active', ?)`,
      [id, operationId, now]
    );
    return {
      id,
      operationId,
      status: 'active',
      currentStepId: null,
      startedAt: now,
      completedAt: null,
      finalMitre: []
    };
  });
}

export async function pauseRun(runId: string): Promise<void> {
  await withPersistence(async (h) => {
    h.run(`UPDATE runs SET status = 'paused' WHERE id = ?`, [runId]);
  });
}

export async function resumeRun(runId: string): Promise<void> {
  await withPersistence(async (h) => {
    const r = h.exec(`SELECT status FROM runs WHERE id = ?`, [runId]);
    if (r.length === 0 || r[0]!.values.length === 0) throw new Error('run not found');
    if (r[0]!.values[0]![0] !== 'paused') throw new Error(`run is not paused`);
    h.run(`UPDATE runs SET status = 'active' WHERE id = ?`, [runId]);
  });
}

export interface StepSubmissionInput {
  stepId: string;
  verdict: 'tp' | 'fp' | 'benign' | null;
  note?: string;
  mitreTags?: string[];
  hintsUsed?: number;
  startedAt?: number;
}

export async function submitStep(runId: string, input: StepSubmissionInput): Promise<string> {
  return withPersistence(async (h) => {
    // Get current run state + operation payload for gating
    const runRes = h.exec(
      `SELECT r.status, r.operation_id, o.payload
       FROM runs r JOIN operations o ON r.operation_id = o.id
       WHERE r.id = ?`,
      [runId]
    );
    if (runRes.length === 0) throw new Error('run not found');
    const [status, opId, opPayloadStr] = runRes[0]!.values[0]! as [string, string, string];
    if (status === 'completed') throw new Error('run already completed');

    const opSteps: any[] = JSON.parse(opPayloadStr).steps ?? [];
    const stepIdx = opSteps.findIndex((s: any) => s.id === input.stepId);
    if (stepIdx < 0) throw new Error('unknown step id');

    // Gating: must submit prior step first
    if (stepIdx > 0) {
      const prevStepId = opSteps[stepIdx - 1]!.id;
      const prev = h.exec(
        `SELECT COUNT(*) FROM step_submissions WHERE run_id = ? AND step_id = ? AND verdict IS NOT NULL`,
        [runId, prevStepId]
      );
      if ((prev[0]?.values?.[0]?.[0] ?? 0) === 0) {
        throw new Error(`must submit prior step ${prevStepId} first`);
      }
    }

    const id = `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    h.run(
      `INSERT INTO step_submissions (id, run_id, step_id, verdict, note, mitre_tags, hints_used, started_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        runId,
        input.stepId,
        input.verdict,
        input.note ?? '',
        JSON.stringify(input.mitreTags ?? []),
        input.hintsUsed ?? 0,
        input.startedAt ?? now,
        now
      ]
    );
    h.run(`UPDATE runs SET current_step_id = ? WHERE id = ?`, [input.stepId, runId]);
    return id;
  });
}

export interface CompleteOutput {
  score: any;
  trackCompleted: string[];
}

export async function completeRun(runId: string, finalMitre: string[]): Promise<CompleteOutput> {
  return withPersistence(async (h) => {
    if (finalMitre.length === 0) throw new Error('final MITRE set is required');

    const runRes = h.exec(
      `SELECT r.operation_id, r.status, o.payload
       FROM runs r JOIN operations o ON r.operation_id = o.id
       WHERE r.id = ?`,
      [runId]
    );
    if (runRes.length === 0) throw new Error('run not found');
    const [opId, status, opPayloadStr] = runRes[0]!.values[0]! as [string, string, string];
    if (status === 'completed') throw new Error('run already completed');

    const now = Date.now();
    h.run(
      `UPDATE runs SET status = 'completed', completed_at = ?, final_mitre = ? WHERE id = ?`,
      [now, JSON.stringify(finalMitre), runId]
    );

    // Score the run
    const { scoreRun } = await import('@blueteam-emu/grading');
    const subsRes = h.exec(
      `SELECT step_id, verdict, note, mitre_tags, hints_used, started_at, submitted_at
       FROM step_submissions WHERE run_id = ? ORDER BY submitted_at ASC`,
      [runId]
    );
    const opSteps: any[] = JSON.parse(opPayloadStr).steps ?? [];
    const stepMap = new Map(opSteps.map((s: any) => [s.id, s]));
    const submissions = (subsRes[0]?.values ?? []).map((row: any) => ({
      stepId: row[0],
      verdict: row[1],
      note: row[2] ?? '',
      mitreTags: JSON.parse(row[3] ?? '[]'),
      hintsUsed: row[4] ?? 0,
      startedAt: row[5],
      submittedAt: row[6]
    }));

    const runRecord = {
      id: runId,
      operationId: opId,
      startedAt: submissions[0]?.startedAt ?? now,
      completedAt: now,
      finalMitre,
      hintsUsedTotal: submissions.reduce((a: number, s: any) => a + s.hintsUsed, 0),
      hintPenaltiesApplied: 0,
      uniqueConsoles: new Set<string>(),
      submissions: submissions.map((s: any) => {
        const cfg = stepMap.get(s.stepId);
        return {
          ...s,
          expectedVerdict: cfg?.expected_verdict,
          expectedMitre: cfg?.expected_mitre ?? [],
          expectedIndicators: cfg?.expected_indicators ?? [],
          hintsPenaltyPercent: cfg?.hint_penalty_percent ?? 10,
          consolesTouched: ['siem'],
          stepBudgetSeconds: 60
        };
      })
    };
    const score = scoreRun(runRecord as any);

    // Check track completions
    const trackOpsRes = h.exec(
      `SELECT t.id, t.threshold FROM tracks t
       JOIN track_operations tro ON t.id = tro.track_id
       WHERE tro.operation_id = ?`,
      [opId]
    );
    const trackCompleted: string[] = [];
    for (const row of trackOpsRes[0]?.values ?? []) {
      const [trackId, threshold] = row as [string, number];
      // Check all operations in this track are passed
      const allRes = h.exec(`SELECT operation_id FROM track_operations WHERE track_id = ?`, [trackId]);
      const allOpIds = (allRes[0]?.values ?? []).map((r: any) => r[0]);
      let allPassed = true;
      for (const oid of allOpIds) {
        const best = h.exec(
          `SELECT COUNT(*) FROM runs WHERE operation_id = ? AND user_id = 'local' AND status = 'completed'`,
          [oid]
        );
        if ((best[0]?.values?.[0]?.[0] ?? 0) === 0) {
          allPassed = false;
          break;
        }
      }
      if (allPassed && allOpIds.length > 0) {
    h.run(
          `INSERT OR IGNORE INTO track_completions (user_id, track_id, completed_at) VALUES ('local', ?, ?)`,
          [trackId, now]
        );
        trackCompleted.push(trackId);
      }
    }

    return { score, trackCompleted };
  });
}

export async function listMyRuns(operationId?: string): Promise<RunRecord[]> {
  const h = await getDb();
  let sql = `SELECT id, operation_id, status, current_step_id, started_at, completed_at, final_mitre FROM runs WHERE user_id = 'local'`;
  const params: any[] = [];
  if (operationId) {
    sql += ` AND operation_id = ?`;
    params.push(operationId);
  }
  sql += ` ORDER BY started_at DESC`;
  const res = h.db.exec(sql, params);
  return (res[0]?.values ?? []).map((row: any) => ({
    id: row[0],
    operationId: row[1],
    status: row[2],
    currentStepId: row[3],
    startedAt: row[4],
    completedAt: row[5],
    finalMitre: JSON.parse(row[6] ?? '[]')
  }));
}
