import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  AlertSchema,
  FirewallConnectionSchema,
  GroundTruthSchema,
  LogEventSchema,
  OperationSchema,
  TrackSchema
} from './schemas.js';
import { isKnownMitreId, loadMitreReference } from './mitre.js';
import type {
  Alert,
  FirewallConnection,
  GroundTruth,
  LogEvent,
  Operation,
  Track
} from './schemas.js';

export interface LoadedOperation {
  operation: Operation;
  alerts: Alert[];
  logs: LogEvent[];
  firewall: FirewallConnection[];
  groundTruth: GroundTruth;
  sourceDir: string;
}

export interface LoadedTrackFile {
  tracks: Track[];
  sourceDir: string;
}

export interface ScenarioIssue {
  severity: 'error' | 'warning';
  file: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  operations: { id: string; ok: boolean; issues: ScenarioIssue[] }[];
  tracks: { id: string; ok: boolean; issues: ScenarioIssue[] }[];
  issues: ScenarioIssue[];
}

async function readJson<T>(
  file: string,
  schema: { parse: (x: unknown) => T },
  issues: ScenarioIssue[],
  required = true,
): Promise<T | undefined> {
  try {
    const text = await fs.readFile(file, 'utf8');
    const data = JSON.parse(text);
    const parsed = schema.parse(data);
    return parsed;
  } catch (err) {
    if (!required && (err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    issues.push({
      severity: 'error',
      file,
      message: err instanceof Error ? err.message : String(err)
    });
    return undefined;
  }
}

async function readJsonl<T>(
  file: string,
  schema: { parse: (x: unknown) => T },
  issues: ScenarioIssue[],
  required = false,
): Promise<T[]> {
  try {
    const text = await fs.readFile(file, 'utf8');
    const out: T[] = [];
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      try {
        out.push(schema.parse(JSON.parse(line)));
      } catch (err) {
        issues.push({
          severity: 'error',
          file: `${file}:${i + 1}`,
          message: err instanceof Error ? err.message : String(err)
        });
      }
    }
    return out;
  } catch (err) {
    if (!required && (err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    issues.push({
      severity: 'error',
      file,
      message: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

export async function loadOperation(
  dir: string,
  issues: ScenarioIssue[] = [],
): Promise<{ result?: LoadedOperation; issues: ScenarioIssue[] }> {
  const opPath = path.join(dir, 'operation.json');

  let operation: Operation | undefined;
  try {
    const text = await fs.readFile(opPath, 'utf8');
    operation = OperationSchema.parse(JSON.parse(text));
  } catch (err) {
    issues.push({ severity: 'error', file: opPath, message: (err as Error).message });
    return { issues };
  }

  // steps
  const stepsDir = path.join(dir, 'steps');
  const stepFiles = (await fs.readdir(stepsDir).catch(() => [])).sort();
  const expectedStepIds = new Set(operation.steps.map((s) => s.id));
  if (stepFiles.length !== operation.steps.length) {
    issues.push({
      severity: 'warning',
      file: stepsDir,
      message: `declared ${operation.steps.length} step(s) but found ${stepFiles.length} file(s) under steps/`
    });
  }
  for (const f of stepFiles) {
    if (!f.endsWith('.json')) continue;
    const file = path.join(stepsDir, f);
    try {
      const text = await fs.readFile(file, 'utf8');
      const data = JSON.parse(text);
      if (!expectedStepIds.has(data.id)) {
        issues.push({
          severity: 'warning',
          file,
          message: `step file id "${data.id}" is not in operation.steps[]`
        });
      }
    } catch (err) {
      issues.push({ severity: 'error', file, message: (err as Error).message });
    }
  }

  // alerts, logs, firewall (all optional)
  const alerts = await readJsonl(path.join(dir, 'data/alerts.jsonl'), AlertSchema, issues);
  const logs = await readJsonl(path.join(dir, 'data/logs.jsonl'), LogEventSchema, issues);
  const firewall = await readJsonl(
    path.join(dir, 'data/firewall.jsonl'),
    FirewallConnectionSchema,
    issues,
    false,
  );

  // ground truth (required per spec)
  const groundTruthRaw = await readJson(
    path.join(dir, 'data/ground_truth.json'),
    GroundTruthSchema,
    issues,
  );
  if (!groundTruthRaw) return { issues };

  // cross-reference resolution
  const alertIds = new Set(alerts.map((a) => a.id));
  const logIds = new Set(logs.map((l) => l.id));
  for (const step of groundTruthRaw.steps) {
    for (const aid of step.references.alert_ids) {
      if (!alertIds.has(aid)) {
        issues.push({
          severity: 'error',
          file: path.join(dir, 'data/ground_truth.json'),
          message: `step "${step.step_id}" references unknown alert id "${aid}"`
        });
      }
    }
    for (const lid of step.references.log_ids) {
      if (!logIds.has(lid)) {
        issues.push({
          severity: 'error',
          file: path.join(dir, 'data/ground_truth.json'),
          message: `step "${step.step_id}" references unknown log id "${lid}"`
        });
      }
    }
    const declaredStepIds = new Set(operation.steps.map((s) => s.id));
    if (!declaredStepIds.has(step.step_id)) {
      issues.push({
        severity: 'error',
        file: path.join(dir, 'data/ground_truth.json'),
        message: `ground truth references undeclared step id "${step.step_id}"`
      });
    }
  }

  // mitre validation
  loadMitreReference();
  const seenMitre = new Set<string>();
  for (const t of operation.mitre_techniques) seenMitre.add(t);
  for (const s of operation.steps) for (const t of s.expected_mitre) seenMitre.add(t);
  for (const t of groundTruthRaw.operation_mitre) seenMitre.add(t);
  for (const id of seenMitre) {
    if (!isKnownMitreId(id)) {
      issues.push({
        severity: 'error',
        file: dir,
        message: `unknown MITRE technique id "${id}"`
      });
    }
  }

  return {
    result: {
      operation,
      alerts,
      logs,
      firewall,
      groundTruth: groundTruthRaw,
      sourceDir: dir
    },
    issues
  };
}

export async function loadTracksFile(file: string): Promise<LoadedTrackFile | undefined> {
  try {
    const text = await fs.readFile(file, 'utf8');
    const raw = JSON.parse(text);
    const tracks = z.array(TrackSchema).parse(raw.tracks);
    return { tracks, sourceDir: path.dirname(file) };
  } catch (err) {
    throw new Error(`failed to load tracks file ${file}: ${(err as Error).message}`);
  }
}

export async function validateScenarios(
  contentDir: string,
): Promise<ValidationResult> {
  const issues: ScenarioIssue[] = [];
  const operationsDir = path.join(contentDir, 'operations');
  const tracksFile = path.join(contentDir, 'tracks.json');

  const opDirs = (await fs.readdir(operationsDir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const opResults: ValidationResult['operations'] = [];
  const loadedOpIds = new Set<string>();
  for (const id of opDirs) {
    const dir = path.join(operationsDir, id);
    const opIssueCountBefore = issues.length;
    const { result, issues: opIssues } = await loadOperation(dir, issues);
    if (result) loadedOpIds.add(result.operation.id);
    opResults.push({
      id,
      ok: opIssues.length === opIssueCountBefore,
      issues: issues.slice(opIssueCountBefore).filter((i) => i.file.startsWith(dir))
    });
  }

  const trackResults: ValidationResult['tracks'] = [];
  let tracksExists = true;
  try {
    await fs.access(tracksFile);
  } catch {
    tracksExists = false;
  }
  if (tracksExists) {
    try {
      const loaded = await loadTracksFile(tracksFile);
      if (loaded) {
        for (const t of loaded.tracks) {
          const localIssues: ScenarioIssue[] = [];
          for (const oid of t.operation_ids) {
            if (!loadedOpIds.has(oid)) {
              localIssues.push({
                severity: 'error',
                file: tracksFile,
                message: `track "${t.id}" references unknown operation id "${oid}"`
              });
            }
          }
          if (t.gating.threshold < 0 || t.gating.threshold > 100) {
            localIssues.push({
              severity: 'error',
              file: tracksFile,
              message: `track "${t.id}" has out-of-range gating.threshold ${t.gating.threshold}`
            });
          }
          trackResults.push({ id: t.id, ok: localIssues.length === 0, issues: localIssues });
          issues.push(...localIssues);
        }
      }
    } catch (err) {
      issues.push({ severity: 'error', file: tracksFile, message: (err as Error).message });
    }
  }

  return {
    ok: issues.every((i) => i.severity !== 'error'),
    operations: opResults,
    tracks: trackResults,
    issues
  };
}

export { loadMitreReference, isKnownMitreId } from './mitre.js';
