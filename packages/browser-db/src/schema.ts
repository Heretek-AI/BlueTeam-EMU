/**
 * SQL schema for the browser database. Mirrors the Drizzle schema
 * that shipped with `add-blueteam-emu`, translated to plain SQLite
 * DDL. Table and column names match exactly.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  source_dir TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS track_operations (
  track_id TEXT NOT NULL REFERENCES tracks(id),
  operation_id TEXT NOT NULL REFERENCES operations(id),
  order_index INTEGER NOT NULL,
  PRIMARY KEY (track_id, operation_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id TEXT NOT NULL REFERENCES users(id),
  track_id TEXT NOT NULL REFERENCES tracks(id),
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS track_completions (
  user_id TEXT NOT NULL REFERENCES users(id),
  track_id TEXT NOT NULL REFERENCES tracks(id),
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  operation_id TEXT NOT NULL REFERENCES operations(id),
  status TEXT NOT NULL,
  current_step_id TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  final_mitre TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS step_submissions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  step_id TEXT NOT NULL,
  verdict TEXT,
  note TEXT,
  mitre_tags TEXT NOT NULL DEFAULT '[]',
  hints_used INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  submitted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  last_run_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  host TEXT,
  user TEXT,
  process TEXT,
  pid INTEGER,
  ppid INTEGER,
  suspicious INTEGER NOT NULL DEFAULT 0,
  suspicion_rule TEXT,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_entities (
  event_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (event_id, entity_id, role)
);

CREATE TABLE IF NOT EXISTS firewall_events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  src_ip TEXT NOT NULL,
  dst_ip TEXT NOT NULL,
  dport INTEGER NOT NULL,
  proto TEXT NOT NULL,
  bytes_out INTEGER NOT NULL DEFAULT 0,
  bytes_in INTEGER NOT NULL DEFAULT 0,
  asn TEXT,
  dst_host TEXT
);

CREATE TABLE IF NOT EXISTS mitre_techniques (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tactic TEXT NOT NULL
);
`;
