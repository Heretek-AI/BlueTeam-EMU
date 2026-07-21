import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at').notNull()
});

export const operations = sqliteTable('operations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  difficulty: text('difficulty').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  xp: integer('xp').notNull(),
  sourceDir: text('source_dir').notNull(),
  payload: text('payload').notNull()
});

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  difficulty: text('difficulty').notNull(),
  threshold: integer('threshold').notNull(),
  payload: text('payload').notNull()
});

export const trackOperations = sqliteTable(
  'track_operations',
  {
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id),
    operationId: text('operation_id')
      .notNull()
      .references(() => operations.id),
    orderIndex: integer('order_index').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.trackId, t.operationId] }) })
);

export const enrollments = sqliteTable(
  'enrollments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id)
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.trackId] }) })
);

export const trackCompletions = sqliteTable(
  'track_completions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id),
    completedAt: integer('completed_at').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.trackId] }) })
);

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  operationId: text('operation_id')
    .notNull()
    .references(() => operations.id),
  status: text('status').notNull(),
  currentStepId: text('current_step_id'),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  finalMitre: text('final_mitre').notNull().default('[]')
});

export const stepSubmissions = sqliteTable('step_submissions', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  stepId: text('step_id').notNull(),
  verdict: text('verdict'),
  note: text('note'),
  mitreTags: text('mitre_tags').notNull().default('[]'),
  hintsUsed: integer('hints_used').notNull().default(0),
  startedAt: integer('started_at').notNull(),
  submittedAt: integer('submitted_at').notNull()
});

export const savedSearches = sqliteTable('saved_searches', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  query: text('query').notNull(),
  lastRunAt: integer('last_run_at').notNull()
});

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  value: text('value').notNull()
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  operationId: text('operation_id').notNull(),
  ts: integer('ts').notNull(),
  source: text('source').notNull(),
  kind: text('kind').notNull(),
  host: text('host'),
  user: text('user'),
  process: text('process'),
  pid: integer('pid'),
  ppid: integer('ppid'),
  suspicious: integer('suspicious').notNull().default(0),
  suspicionRule: text('suspicion_rule'),
  payload: text('payload').notNull()
});

export const eventEntities = sqliteTable(
  'event_entities',
  {
    eventId: text('event_id').notNull(),
    entityId: text('entity_id').notNull(),
    role: text('role').notNull()
  },
  (t) => ({ pk: primaryKey({ columns: [t.eventId, t.entityId, t.role] }) })
);

export const firewallEvents = sqliteTable('firewall_events', {
  id: text('id').primaryKey(),
  operationId: text('operation_id').notNull(),
  ts: integer('ts').notNull(),
  srcIp: text('src_ip').notNull(),
  dstIp: text('dst_ip').notNull(),
  dport: integer('dport').notNull(),
  proto: text('proto').notNull(),
  bytesOut: integer('bytes_out').notNull().default(0),
  bytesIn: integer('bytes_in').notNull().default(0),
  asn: text('asn'),
  dstHost: text('dst_host')
});

export const mitreTechniques = sqliteTable('mitre_techniques', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tactic: text('tactic').notNull()
});
