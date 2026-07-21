import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { validateScenarios } from '@blueteam-emu/scenario';
import * as schema from './schema.js';
import * as dbSchema from './schema.js';

const file = path.resolve(process.cwd(), process.env.DATABASE_URL ?? './data/app.db');
if (!existsSync(file)) {
  console.error(`No database at ${file}. Run \`pnpm db:migrate\` first.`);
  process.exit(1);
}
const sqlite = new Database(file);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite, { schema: dbSchema });

const contentDir = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? '../content');
const result = await validateScenarios(contentDir);
if (!result.ok) {
  console.error('Scenarios failed validation; aborting seed.');
  for (const i of result.issues) console.error(`  [${i.severity}] ${i.file}: ${i.message}`);
  process.exit(1);
}

async function main() {
  await db.delete(schema.events);
  await db.delete(schema.firewallEvents);
  await db.delete(schema.eventEntities);
  await db.delete(schema.entities);
  await db.delete(schema.trackOperations);
  await db.delete(schema.tracks);
  await db.delete(schema.operations);

  for (const opRes of result.operations) {
    const dir = path.join(contentDir, 'operations', opRes.id);
    const { result: loaded } = await validateScenarios(contentDir);
    // validateScenarios returned a coarse view; reload via loadOperation semantics by reusing result.
    // We rely on validateScenarios-side loadedOpIds ordering; do a per-op file read instead.
    await loadSingleOperation(db, dir, opRes.id);
  }

  // Tracks
  const tracksJson = JSON.parse(
    await (await import('node:fs/promises')).readFile(path.join(contentDir, 'tracks.json'), 'utf8')
  );
  for (const t of tracksJson.tracks) {
    await db
      .insert(schema.tracks)
      .values({
        id: t.id,
        title: t.title,
        summary: t.summary,
        difficulty: t.difficulty,
        threshold: t.gating.threshold,
        payload: JSON.stringify(t)
      })
      .onConflictDoUpdate({
        target: schema.tracks.id,
        set: { title: t.title, summary: t.summary, threshold: t.gating.threshold, payload: JSON.stringify(t) }
      });
    for (let i = 0; i < t.operation_ids.length; i++) {
      const opId = t.operation_ids[i]!;
      await db
        .insert(schema.trackOperations)
        .values({ trackId: t.id, operationId: opId, orderIndex: i })
        .onConflictDoUpdate({
          target: [schema.trackOperations.trackId, schema.trackOperations.operationId],
          set: { orderIndex: i }
        });
    }
  }

  console.log('Scenario seeding complete.');
  sqlite.close();
}

async function loadSingleOperation(
  db: ReturnType<typeof drizzle<typeof schema>>,
  dir: string,
  opId: string,
) {
  const fsPromises = await import('node:fs/promises');
  const opPath = path.join(dir, 'operation.json');
  const opText = await fsPromises.readFile(opPath, 'utf8');
  const opJson = JSON.parse(opText);
  await db
    .insert(schema.operations)
    .values({
      id: opJson.id,
      title: opJson.title,
      summary: opJson.summary,
      difficulty: opJson.difficulty,
      durationMinutes: opJson.duration_minutes,
      xp: opJson.xp,
      sourceDir: dir,
      payload: JSON.stringify(opJson)
    })
    .onConflictDoUpdate({
      target: schema.operations.id,
      set: { title: opJson.title, summary: opJson.summary, payload: JSON.stringify(opJson) }
    });

  const ENTITY_KINDS = ['ips', 'hosts', 'users', 'file_hashes', 'domains'] as const;

  async function readJsonl<T>(file: string): Promise<T[]> {
    try {
      const text = await fsPromises.readFile(file, 'utf8');
      return text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l) as T);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  const alerts = await readJsonl<any>(path.join(dir, 'data/alerts.jsonl'));
  const logs = await readJsonl<any>(path.join(dir, 'data/logs.jsonl'));
  const firewall = await readJsonl<any>(path.join(dir, 'data/firewall.jsonl'));
  const tsOf = (s: string) => Date.parse(s);
  const entityCache = new Map<string, string>();
  async function ensureEntityId(kind: string, value: string): Promise<string> {
    const k = `${kind}:${value}`;
    if (entityCache.has(k)) return entityCache.get(k)!;
    const id = `${kind}-${value}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    await db.insert(schema.entities).values({ id, kind, value }).onConflictDoNothing();
    entityCache.set(k, id);
    return id;
  }

  for (const a of alerts) {
    const evId = `alert-${opId}-${a.id}`;
    await db
      .insert(schema.events)
      .values({
        id: evId,
        operationId: opJson.id,
        ts: tsOf(a.ts),
        source: a.source,
        kind: 'alert',
        payload: JSON.stringify(a)
      })
      .onConflictDoNothing();
    for (const ek of ENTITY_KINDS) {
      const values = a.entities?.[ek] ?? [];
      for (const v of values) {
        const eid = await ensureEntityId(ek.replace(/s$/, ''), v);
        await db
          .insert(schema.eventEntities)
          .values({ eventId: evId, entityId: eid, role: ek })
          .onConflictDoNothing();
      }
    }
  }

  for (const l of logs) {
    const evId = `log-${opId}-${l.id}`;
    await db
      .insert(schema.events)
      .values({
        id: evId,
        operationId: opJson.id,
        ts: tsOf(l.ts),
        source: l.source,
        kind: l.event_type,
        host: l.host,
        user: l.user,
        process: l.process,
        pid: l.pid,
        ppid: l.ppid,
        suspicious: l.suspicious ? 1 : 0,
        suspicionRule: l.suspicion_rule,
        payload: JSON.stringify(l)
      })
      .onConflictDoNothing();
    for (const ek of ENTITY_KINDS) {
      const values = l.entities?.[ek] ?? [];
      for (const v of values) {
        const eid = await ensureEntityId(ek.replace(/s$/, ''), v);
        await db
          .insert(schema.eventEntities)
          .values({ eventId: evId, entityId: eid, role: ek })
          .onConflictDoNothing();
      }
    }
  }

  for (const f of firewall) {
    await db
      .insert(schema.firewallEvents)
      .values({
        id: `fw-${opId}-${f.id}`,
        operationId: opJson.id,
        ts: tsOf(f.ts),
        srcIp: f.src_ip,
        dstIp: f.dst_ip,
        dport: f.dport,
        proto: f.proto,
        bytesOut: f.bytes_out ?? 0,
        bytesIn: f.bytes_in ?? 0,
        asn: f.asn ?? null,
        dstHost: f.dst_host ?? null
      })
      .onConflictDoNothing();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
