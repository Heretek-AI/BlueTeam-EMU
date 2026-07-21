/**
 * Eight competency axes used across the radar.
 *
 * Each axis is documented so authors and analysts can predict scoring.
 * Scores are clamped to `0..100`. See spec:
 * `openspec/changes/add-blueteam-emu/specs/competency-radar/spec.md`.
 */

export const AXES = [
  'speed',
  'accuracy',
  'correlation',
  'methodology',
  'detectionCoverage',
  'documentation',
  'timeToFirstAction',
  'pressure'
] as const;

export type Axis = (typeof AXES)[number];

export interface AxisMeta {
  name: Axis;
  label: string;
  description: string;
}

export const AXIS_META: Record<Axis, AxisMeta> = {
  speed: {
    name: 'speed',
    label: 'Speed',
    description: 'How quickly you submitted verdicts relative to the step budget.'
  },
  accuracy: {
    name: 'accuracy',
    label: 'Accuracy',
    description: 'Per-step verdict and MITRE correctness.'
  },
  correlation: {
    name: 'correlation',
    label: 'Cross-tool Correlation',
    description: 'Use of SIEM, XDR, and Firewall evidence together to reach a verdict.'
  },
  methodology: {
    name: 'methodology',
    label: 'Methodology',
    description: 'Following the runbook, using hints sparingly, completing every step.'
  },
  detectionCoverage: {
    name: 'detectionCoverage',
    label: 'Detection Coverage',
    description: 'Coverage across the operation: how many alerts you triaged correctly.'
  },
  documentation: {
    name: 'documentation',
    label: 'Documentation',
    description: 'Notes that mention the expected key indicators.'
  },
  timeToFirstAction: {
    name: 'timeToFirstAction',
    label: 'Time to First Action',
    description: 'How quickly you engaged with the operation after starting.'
  },
  pressure: {
    name: 'pressure',
    label: 'Pressure Handling',
    description: 'Steady pace across the run without long pauses between steps.'
  }
};

export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return 0;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function emptyScores(): Record<Axis, number> {
  return AXES.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<Axis, number>
  );
}
