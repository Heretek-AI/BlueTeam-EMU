import type { Axis } from './axes.js';
import { AXES, clamp, emptyScores } from './axes.js';

/**
 * Run record shape consumed by `scoreRun`. Persisted by the app via
 * Drizzle; lives in-memory for the grading engine.
 */
export interface RunRecord {
  id: string;
  operationId: string;
  startedAt: number; // ms epoch
  completedAt: number | null;
  submissions: StepSubmissionRecord[];
  finalMitre: string[];
  // Run-level signals (computed from submissions).
  hintsUsedTotal: number;
  hintPenaltiesApplied: number;
  uniqueConsoles: Set<string>;
}

export interface StepSubmissionRecord {
  stepId: string;
  verdict: 'tp' | 'fp' | 'benign' | null;
  note: string;
  mitreTags: string[];
  startedAt: number; // ms epoch when step became active
  submittedAt: number; // ms epoch when submitted
  hintsUsed: number;
  expectedVerdict: 'tp' | 'fp' | 'benign' | undefined;
  expectedMitre: string[];
  expectedIndicators: string[];
  hintsPenaltyPercent: number;
  consolesTouched: string[]; // names of consoles the analyst used in this step
  stepBudgetSeconds: number; // per-step target; running out is informational
}

/**
 * Per-step score: 0..1 per axis. Aggregated to per-run 0..100 below.
 */
export interface StepScore {
  stepId: string;
  perAxis: Record<Axis, number>;
}

export interface RunScore {
  runId: string;
  perAxis: Record<Axis, number>;
  composite: number;
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

export function indicatorRecall(submitted: string, expected: string[]): number {
  if (expected.length === 0) return 0; // no note expected => contributes nothing
  const lower = submitted.toLowerCase();
  let hits = 0;
  for (const e of expected) {
    if (lower.includes(e.toLowerCase())) hits++;
  }
  return hits / expected.length;
}

function scoreStep(step: StepSubmissionRecord): StepScore {
  const verdict = step.expectedVerdict
    ? step.verdict === step.expectedVerdict
      ? 1
      : 0
    : 0;
  const mitre = step.expectedMitre.length
    ? jaccard(step.mitreTags, step.expectedMitre)
    : 0;
  const note = indicatorRecall(step.note, step.expectedIndicators);

  const hintPenaltyUnits = (step.hintsUsed * step.hintsPenaltyPercent) / 100; // 0..n
  const methodology = step.expectedVerdict
    ? Math.max(0, 1 - hintPenaltyUnits) * 1.0
    : 0;

  const correlation = Math.min(1, new Set(step.consolesTouched).size / 2); // need ≥2 tools

  // Accuracy blends verdict + MITRE; note feeds documentation independently.
  const accuracy = verdict === 0 ? 0 : (verdict + mitre) / 2;
  const documentation = note;

  // Speed: how fast vs step budget. < budget = full credit, > 2x budget = 0.
  const elapsedSec = Math.max(1, (step.submittedAt - step.startedAt) / 1000);
  const speed =
    step.stepBudgetSeconds > 0
      ? clamp(1 - Math.max(0, elapsedSec - step.stepBudgetSeconds) / step.stepBudgetSeconds, 0, 1)
      : 0;

  // detectionCoverage and pressure are aggregated at run level; carry as 0 here.
  const perAxis: Record<Axis, number> = {
    ...emptyScores(),
    speed,
    accuracy,
    correlation,
    methodology,
    documentation
  };
  return { stepId: step.stepId, perAxis };
}

/**
 * Compute the per-axis 0..100 scores for a run, clamping and blending.
 *
 * - `speed`, `accuracy`, `correlation`, `methodology`, `documentation`
 *   come from per-step averages.
 * - `detectionCoverage` = fraction of submitted steps with TP verdict
 *   among expected-TP steps (scored 0..1 then scaled).
 * - `timeToFirstAction` = 1 if the first submission landed within 2x
 *   budget, scaled linearly down to 0 at 10x budget.
 * - `pressure` = 1 − coefficient-of-variation of inter-step gaps.
 */
export function scoreRun(run: RunRecord): RunScore {
  if (run.submissions.length === 0) {
    return { runId: run.id, perAxis: emptyScores(), composite: 0 };
  }
  const stepScores = run.submissions.map(scoreStep);

  const sumAxis = (axis: Axis) =>
    stepScores.reduce((acc, s) => acc + s.perAxis[axis], 0);
  const avg = (axis: Axis) => sumAxis(axis) / stepScores.length;

  // detectionCoverage: among steps with expectedVerdict=='tp', what fraction
  // were submitted as 'tp'? 0 in the absence of expected-tp steps.
  const tpSteps = run.submissions.filter((s) => s.expectedVerdict === 'tp');
  const detectionCoverage =
    tpSteps.length === 0
      ? 0
      : tpSteps.filter((s) => s.verdict === 'tp').length / tpSteps.length;

  // timeToFirstAction
  const first = run.submissions[0]!;
  const firstElapsed = (first.submittedAt - run.startedAt) / 1000;
  const firstBudget = first.stepBudgetSeconds * 4 || 600; // generous
  const timeToFirstAction = clamp(
    1 - Math.max(0, firstElapsed - firstBudget) / firstBudget,
    0,
    1
  );

  // pressure
  let pressure = 1;
  if (run.submissions.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < run.submissions.length; i++) {
      const prev = run.submissions[i - 1]!;
      const cur = run.submissions[i]!;
      gaps.push(Math.max(1, (cur.submittedAt - prev.submittedAt) / 1000));
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance =
      gaps.reduce((acc, g) => acc + (g - mean) ** 2, 0) / gaps.length;
    const std = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : std / mean;
    pressure = clamp(1 - Math.min(1, cv), 0, 1);
  }

  const perAxisRaw: Record<Axis, number> = {
    speed: avg('speed'),
    accuracy: avg('accuracy'),
    correlation: avg('correlation'),
    methodology: avg('methodology'),
    detectionCoverage,
    documentation: avg('documentation'),
    timeToFirstAction,
    pressure
  };

  const perAxis: Record<Axis, number> = { ...emptyScores() };
  for (const k of AXES) perAxis[k] = Math.round(clamp(perAxisRaw[k]) * 100);

  const composite =
    Math.round(
      (AXES.reduce((acc, k) => acc + perAxis[k], 0) / AXES.length) * 100
    ) / 100;

  return { runId: run.id, perAxis, composite };
}
