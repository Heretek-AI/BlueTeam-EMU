import type { Axis } from './axes.js';
import { AXES, clamp, emptyScores } from './axes.js';
import type { RunScore } from './score.js';
import { scoreRun } from './score.js';
import type { RunRecord } from './score.js';

/**
 * Aggregate radar scores across scopes.
 *
 * - per-operation: mean of completed run scores weighted by completion.
 * - per-track: mean of operation aggregates (single uniform weight).
 * - per-user: mean of track aggregates (single uniform weight).
 *
 * Re-scoring is idempotent: calling `aggregateRadar` twice with the
 * same input returns byte-identical aggregates.
 */

export type Scope = 'user' | 'track' | 'operation';

export interface AggregateInput {
  // Run records grouped by scope id.
  runsByOperation: Map<string, RunRecord[]>;
  // Operation ids per track id.
  operationsByTrack: Map<string, string[]>;
  // Track ids per user id.
  tracksByUser: Map<string, string[]>;
}

export interface AggregateResult {
  scope: Scope;
  perAxis: Record<Axis, number>;
  composite: number;
  count: number;
}

function meanOfAxes(scores: RunScore[]): Record<Axis, number> {
  const acc = emptyScores();
  if (scores.length === 0) return acc;
  for (const s of scores) {
    for (const k of AXES) acc[k] += s.perAxis[k];
  }
  for (const k of AXES) acc[k] = clamp(acc[k] / scores.length);
  return acc;
}

function operationAggregate(runs: RunRecord[]): RunScore | undefined {
  const scores = runs
    .filter((r) => r.completedAt !== null)
    .map((r) => scoreRun(r));
  if (scores.length === 0) return undefined;
  const perAxis = meanOfAxes(scores);
  const composite =
    AXES.reduce((acc, k) => acc + perAxis[k], 0) / AXES.length;
  return {
    runId: 'op-aggregate',
    perAxis,
    composite
  };
}

export function aggregateOperation(
  runs: RunRecord[]
): AggregateResult {
  const agg = operationAggregate(runs);
  if (!agg) {
    return { scope: 'operation', perAxis: emptyScores(), composite: 0, count: 0 };
  }
  return {
    scope: 'operation',
    perAxis: agg.perAxis,
    composite: agg.composite,
    count: runs.filter((r) => r.completedAt !== null).length
  };
}

export function aggregateTrack(
  operationAggregates: (RunScore | undefined)[]
): AggregateResult {
  const present = operationAggregates.filter(
    (x): x is RunScore => x !== undefined
  );
  if (present.length === 0) {
    return { scope: 'track', perAxis: emptyScores(), composite: 0, count: 0 };
  }
  const perAxis = meanOfAxes(present);
  const composite =
    AXES.reduce((acc, k) => acc + perAxis[k], 0) / AXES.length;
  return { scope: 'track', perAxis, composite, count: present.length };
}

export function aggregateUser(
  trackAggregates: (RunScore | undefined)[]
): AggregateResult {
  const present = trackAggregates.filter(
    (x): x is RunScore => x !== undefined
  );
  if (present.length === 0) {
    return { scope: 'user', perAxis: emptyScores(), composite: 0, count: 0 };
  }
  const perAxis = meanOfAxes(present);
  const composite =
    AXES.reduce((acc, k) => acc + perAxis[k], 0) / AXES.length;
  return { scope: 'user', perAxis, composite, count: present.length };
}

export function aggregateRadar(input: AggregateInput): {
  byOperation: Map<string, AggregateResult>;
  byTrack: Map<string, AggregateResult>;
  byUser: Map<string, AggregateResult>;
} {
  const byOperation = new Map<string, AggregateResult>();
  for (const [opId, runs] of input.runsByOperation) {
    byOperation.set(opId, aggregateOperation(runs));
  }

  const opAggById = new Map<string, RunScore | undefined>();
  for (const [opId, res] of byOperation) {
    opAggById.set(opId, {
      runId: 'op-aggregate',
      perAxis: res.perAxis,
      composite: res.composite
    });
  }
  const byTrack = new Map<string, AggregateResult>();
  for (const [trackId, opIds] of input.operationsByTrack) {
    const aggs = opIds.map((oid) => opAggById.get(oid));
    byTrack.set(trackId, aggregateTrack(aggs));
  }

  const trackAggById = new Map<string, RunScore | undefined>();
  for (const [trackId, res] of byTrack) {
    trackAggById.set(trackId, {
      runId: 'track-aggregate',
      perAxis: res.perAxis,
      composite: res.composite
    });
  }
  const byUser = new Map<string, AggregateResult>();
  for (const [userId, trackIds] of input.tracksByUser) {
    const aggs = trackIds.map((tid) => trackAggById.get(tid));
    byUser.set(userId, aggregateUser(aggs));
  }

  return { byOperation, byTrack, byUser };
}
