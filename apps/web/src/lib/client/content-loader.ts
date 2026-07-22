import { withPersistence } from './db.js';

const BASE = '/BlueTeam-EMU/content';

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function fetchJsonl(path: string) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`failed to fetch ${path}: ${res.status}`);
  return res.text().then((t) =>
    t
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l))
  );
}

const ENTITY_KINDS = ['ips', 'hosts', 'users', 'file_hashes', 'domains'] as const;

/**
 * Load bundled scenario content into the browser database.
 * Idempotent — skips if operations table is already populated.
 */
export async function hydrateContent(): Promise<void> {
  await withPersistence(async (h) => {
    // Check if already seeded
    const existing = h.exec(`SELECT COUNT(*) FROM operations`);
    if (Number(existing[0]!.values[0]![0]!) > 0) return;

    // Load tracks
    const tracksData: any = await fetchJson('tracks.json');
    for (const t of tracksData.tracks ?? tracksData) {
      h.run(
        `INSERT INTO tracks (id, title, summary, difficulty, threshold, payload) VALUES (?, ?, ?, ?, ?, ?)`,
        [t.id, t.title, t.summary, t.difficulty, t.gating.threshold, JSON.stringify(t)]
      );
      for (let i = 0; i < t.operation_ids.length; i++) {
        h.run(`INSERT INTO track_operations (track_id, operation_id, order_index) VALUES (?, ?, ?)`, [
          t.id,
          t.operation_ids[i],
          i
        ]);
      }
    }

    // Load each operation
    const operationsDirs = await fetch('content/operations/index.json')
      .then((r) => r.ok && r.json())
      .catch(() => null);
    const opIds =
      operationsDirs ??
      tracksData.tracks?.flatMap?.((t: any) => t.operation_ids) ?? [];
    for (const id of opIds) {
      const op: any = await fetchJson(`operations/${id}/operation.json`);
      h.run(
        `INSERT INTO operations (id, title, summary, difficulty, duration_minutes, xp, source_dir, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [op.id, op.title, op.summary, op.difficulty, op.duration_minutes, op.xp, `content/operations/${id}`, JSON.stringify(op)]
      );

      // Seed MITRE from operation metadata
      for (const tid of op.mitre_techniques ?? []) {
        h.run(`INSERT OR IGNORE INTO mitre_techniques (id, name, tactic) VALUES (?, ?, ?)`, [tid, tid, 'unknown']);
      }
    }

    // Load events from JSONL per operation
    // We use the operations already inserted as the source of truth.
    const allOps = h.exec(`SELECT id FROM operations`);
    if (allOps.length === 0) return;
    for (const row of allOps[0]!.values) {
      const opId = row[0] as string;
      await loadOperationEvents(h, opId);
    }
  });
}

async function loadOperationEvents(
  db: import('sql.js').Database,
  opId: string
) {
  const alerts = await fetchJsonl(`operations/${opId}/data/alerts.jsonl`).catch(() => []);
  const logs = await fetchJsonl(`operations/${opId}/data/logs.jsonl`).catch(() => []);
  const firewall = await fetchJsonl(`operations/${opId}/data/firewall.jsonl`).catch(() => []);

  const entityCache = new Map<string, string>();
  function ensureEntity(kind: string, value: string): string {
    const k = `${kind}:${value}`;
    if (entityCache.has(k)) return entityCache.get(k)!;
    const id = `${kind}-${value}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    db.run(`INSERT OR IGNORE INTO entities (id, kind, value) VALUES (?, ?, ?)`, [id, kind, value]);
    entityCache.set(k, id);
    return id;
  }
  const tsOf = (s: string) => Date.parse(s) || 0;

  for (const a of alerts) {
    const evId = `alert-${opId}-${a.id}`;
    db.run(
      `INSERT OR IGNORE INTO events (id, operation_id, ts, source, kind, payload) VALUES (?, ?, ?, ?, 'alert', ?)`,
      [evId, opId, tsOf(a.ts), a.source, JSON.stringify(a)]
    );
  }

  for (const l of logs) {
    const evId = `log-${opId}-${l.id}`;
    db.run(
      `INSERT OR IGNORE INTO events (id, operation_id, ts, source, kind, host, user, process, pid, ppid, suspicious, suspicion_rule, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evId,
        opId,
        tsOf(l.ts),
        l.source,
        l.event_type ?? 'unknown',
        l.host ?? null,
        l.user ?? null,
        l.process ?? null,
        l.pid ?? null,
        l.ppid ?? null,
        l.suspicious ? 1 : 0,
        l.suspicion_rule ?? null,
        JSON.stringify(l)
      ]
    );
    for (const ek of ENTITY_KINDS) {
      const vals = l.entities?.[ek] ?? [];
      for (const v of vals) {
        const eid = ensureEntity(ek.replace(/s$/, ''), v);
        db.run(`INSERT OR IGNORE INTO event_entities (event_id, entity_id, role) VALUES (?, ?, ?)`, [
          evId,
          eid,
          ek
        ]);
      }
    }
  }

  for (const f of firewall) {
    db.run(
      `INSERT OR IGNORE INTO firewall_events (id, operation_id, ts, src_ip, dst_ip, dport, proto, bytes_out, bytes_in, asn, dst_host) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `fw-${opId}-${f.id}`,
        opId,
        tsOf(f.ts),
        f.src_ip,
        f.dst_ip,
        f.dport,
        f.proto,
        f.bytes_out ?? 0,
        f.bytes_in ?? 0,
        f.asn ?? null,
        f.dst_host ?? null
      ]
    );
  }
}
