import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import {
  initDb,
  persistDb,
  clearAllData,
  withDb,
  _resetSingletonForTests
} from '../src/db.js';
import { MemoryBackend } from '../src/storage.js';

const require = createRequire(import.meta.url);
const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');

function opts(backend = new MemoryBackend()) {
  return { backend, wasmUrl: wasm };
}

beforeEach(() => {
  _resetSingletonForTests();
});

describe('browser-db', () => {
  it('initializes a fresh database with the full schema', async () => {
    const h = await initDb(opts());
    const res = h.db.exec(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );
    const tables = res[0]!.values.map((r) => r[0]);
    for (const t of [
      'users',
      'operations',
      'tracks',
      'track_operations',
      'enrollments',
      'track_completions',
      'runs',
      'step_submissions',
      'saved_searches',
      'entities',
      'events',
      'event_entities',
      'firewall_events',
      'mitre_techniques',
      'meta'
    ]) {
      expect(tables).toContain(t);
    }
  });

  it('persists writes and restores them after reload', async () => {
    const backend = new MemoryBackend();
    {
      const h = await initDb(opts(backend));
      h.db.run(`INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)`, [
        'local',
        'analyst',
        Date.now()
      ]);
      await persistDb(h);
    }
    _resetSingletonForTests();
    {
      const h = await initDb(opts(backend));
      const res = h.db.exec(`SELECT display_name FROM users WHERE id = 'local'`);
      expect(res[0]!.values[0]![0]).toBe('analyst');
    }
  });

  it('withDb persists after the callback', async () => {
    const backend = new MemoryBackend();
    await withDb(
      (db) => {
        db.run(
          `INSERT INTO mitre_techniques (id, name, tactic) VALUES ('T1078', 'Valid Accounts', 'defense-evasion')`
        );
      },
      opts(backend)
    );
    _resetSingletonForTests();
    const h = await initDb(opts(backend));
    const res = h.db.exec(`SELECT name FROM mitre_techniques WHERE id = 'T1078'`);
    expect(res[0]!.values[0]![0]).toBe('Valid Accounts');
  });

  it('clearAllData deletes the persisted image', async () => {
    const backend = new MemoryBackend();
    {
      const h = await initDb(opts(backend));
      h.db.run(`INSERT INTO users (id, display_name, created_at) VALUES ('local', 'x', 0)`);
      await persistDb(h);
    }
    await clearAllData(opts(backend));
    expect(await backend.load()).toBeNull();
  });

  it('enforces foreign keys', async () => {
    const h = await initDb(opts());
    expect(h.db.exec('PRAGMA foreign_keys')[0]!.values[0]![0]).toBe(1);
    expect(() =>
      h.db.run(
        `INSERT INTO track_operations (track_id, operation_id, order_index) VALUES ('nope', 'nope', 0)`
      )
    ).toThrow();
  });
});
