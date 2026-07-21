import { describe, it, expect } from 'vitest';
import { jaccard, indicatorRecall, scoreRun } from '../src/score.js';
import type { RunRecord } from '../src/score.js';

describe('jaccard', () => {
  it('returns 1 for identical sets', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
  });
  it('returns 0 for disjoint sets', () => {
    expect(jaccard(['a'], ['b'])).toBe(0);
  });
  it('returns |inter|/|union| for partial overlap', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
  });
  it('treats two empty sets as exact match', () => {
    expect(jaccard([], [])).toBe(1);
  });
});

describe('indicatorRecall', () => {
  it('returns 1 when every indicator appears (case-insensitive)', () => {
    expect(indicatorRecall('we saw Invoice.exe and Lumma-stealer', ['invoice.exe', 'lumma-stealer'])).toBe(1);
  });
  it('returns 0 when no indicator appears', () => {
    expect(indicatorRecall('nothing useful here', ['foo', 'bar'])).toBe(0);
  });
  it('returns 0 when no expected indicators', () => {
    expect(indicatorRecall('any', [])).toBe(0);
  });
});

function makeRun(overrides: Partial<RunRecord> & { submissions?: any[] }): RunRecord {
  return {
    id: overrides.id ?? 'r1',
    operationId: 'op1',
    startedAt: overrides.startedAt ?? 1_700_000_000_000,
    completedAt: overrides.completedAt ?? 1_700_000_900_000,
    submissions: overrides.submissions ?? [],
    finalMitre: overrides.finalMitre ?? [],
    hintsUsedTotal: 0,
    hintPenaltiesApplied: 0,
    uniqueConsoles: new Set<string>(),
    ...overrides
  };
}

describe('scoreRun', () => {
  it('exact MITRE match scores full marks on accuracy', () => {
    const run = makeRun({
      submissions: [
        {
          stepId: 's1',
          verdict: 'tp',
          note: 'invoice.exe seen',
          mitreTags: ['T1566.001'],
          startedAt: 1_700_000_000_000,
          submittedAt: 1_700_000_030_000,
          hintsUsed: 0,
          expectedVerdict: 'tp',
          expectedMitre: ['T1566.001'],
          expectedIndicators: ['invoice.exe'],
          hintsPenaltyPercent: 5,
          consolesTouched: ['siem'],
          stepBudgetSeconds: 60
        }
      ]
    });
    const out = scoreRun(run);
    expect(out.perAxis.accuracy).toBe(100);
    expect(out.perAxis.documentation).toBe(100);
    expect(out.perAxis.methodology).toBe(100);
  });

  it('partial MITRE match scores proportional to overlap', () => {
    const run = makeRun({
      submissions: [
        {
          stepId: 's1',
          verdict: 'tp',
          note: 'none',
          mitreTags: ['T1566.001'],
          startedAt: 1_700_000_000_000,
          submittedAt: 1_700_000_030_000,
          hintsUsed: 0,
          expectedVerdict: 'tp',
          expectedMitre: ['T1566.001', 'T1078'],
          expectedIndicators: [],
          hintsPenaltyPercent: 5,
          consolesTouched: ['siem'],
          stepBudgetSeconds: 60
        }
      ]
    });
    const out = scoreRun(run);
    // jaccard('T1566.001', ['T1566.001','T1078']) = 1/2 => accuracy = (1 + 0.5)/2 = 0.75 -> 75
    expect(out.perAxis.accuracy).toBe(75);
  });

  it('excessive hint penalty clamps methodology to 0', () => {
    const run = makeRun({
      submissions: [
        {
          stepId: 's1',
          verdict: 'tp',
          note: 'n',
          mitreTags: ['T1566.001'],
          startedAt: 1_700_000_000_000,
          submittedAt: 1_700_000_030_000,
          hintsUsed: 5, // 5 * 25% = 125% penalty
          expectedVerdict: 'tp',
          expectedMitre: ['T1566.001'],
          expectedIndicators: [],
          hintsPenaltyPercent: 25,
          consolesTouched: ['siem'],
          stepBudgetSeconds: 60
        }
      ]
    });
    const out = scoreRun(run);
    expect(out.perAxis.methodology).toBe(0);
  });

  it('normalization upper bound holds at 100', () => {
    const run = makeRun({
      submissions: [
        {
          stepId: 's1',
          verdict: 'tp',
          note: 'invoice.exe lumma',
          mitreTags: ['T1566.001'],
          startedAt: 1_700_000_000_000,
          submittedAt: 1_700_000_001_000, // very fast
          hintsUsed: 0,
          expectedVerdict: 'tp',
          expectedMitre: ['T1566.001'],
          expectedIndicators: ['invoice.exe', 'lumma'],
          hintsPenaltyPercent: 0,
          consolesTouched: ['siem', 'xdr', 'firewall'],
          stepBudgetSeconds: 60
        }
      ]
    });
    const out = scoreRun(run);
    for (const k of Object.keys(out.perAxis)) {
      expect(out.perAxis[k as keyof typeof out.perAxis]).toBeLessThanOrEqual(100);
      expect(out.perAxis[k as keyof typeof out.perAxis]).toBeGreaterThanOrEqual(0);
    }
  });

  it('is idempotent (re-scoring stable run returns identical result)', () => {
    const run = makeRun({
      submissions: [
        {
          stepId: 's1',
          verdict: 'tp',
          note: 'invoice.exe',
          mitreTags: ['T1566.001'],
          startedAt: 1_700_000_000_000,
          submittedAt: 1_700_000_030_000,
          hintsUsed: 0,
          expectedVerdict: 'tp',
          expectedMitre: ['T1566.001'],
          expectedIndicators: ['invoice.exe'],
          hintsPenaltyPercent: 5,
          consolesTouched: ['siem'],
          stepBudgetSeconds: 60
        }
      ]
    });
    const a = scoreRun(run);
    const b = scoreRun(run);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
