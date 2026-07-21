## Context

Greenfield repo. Reference products:

- SOCSimulator.com (production-style SIEM / XDR / Firewall consoles,
  MITRE mapping, 8-axis radar, shift mode).
- TryHackMe SOC-sim (gamified, single-console walkthroughs).
- GitHub's own UI as the visual shell metaphor (issues-as-alerts,
  repos-as-cases, status pills, command palette).

Constraints from answers:

- Stack is SvelteKit + SQLite; no managed services.
- First cut ships full guided operations + tracks, not just a triage
  MVP.
- Grading produces a multi-axis competency radar across exactly eight
  axes (see `specs/competency-radar/spec.md`).
- Auth model is local-only: a single local user with no signup, login,
  or session management (see `specs/local-user/spec.md`).
- Scenario authoring is JSON-only; MITRE tags are optional per step
  but required at operation end; hint penalty is a per-step
  configurable percent (see `specs/operations-runs/spec.md`).

## Goals / Non-Goals

**Goals**

- Author once, run anywhere: operations live as files on disk so new
  scenarios can be added without code changes. The format is
  validated by Zod schemas in `packages/scenario` and by a CLI
  (`pnpm validate-scenarios`) per `specs/scenario-format/spec.md`.
- Three production-flavored consoles with cross-tool correlation:
  clicking an IP in SIEM jumps to the matching Firewall filter;
  clicking a host jumps to the XDR entity timeline (see
  `specs/siem-console/spec.md`, `specs/xdr-console/spec.md`,
  `specs/firewall-console/spec.md`).
- Deterministic, replayable grading: `scoreRun` is a pure function
  in `packages/grading` and produces a per-axis score on every call
  per `specs/triage-engine/spec.md` and
  `specs/competency-radar/spec.md`.
- Single-user, runs locally with `pnpm dev`; no Docker required.

**Non-Goals**

- Real telemetry ingestion (Splunk, Elastic, Defender connectors).
- Multi-tenant teams, cohorts, or shared leaderboards.
- Payments, SSO, social auth, OAuth flows.
- AI-generated hints, scenario recommendations, or natural language
  note grading.
- Mobile-first layout — desktop-only at ≥ 1024px.
- Production hardening beyond what SvelteKit and adapter-node give
  for free.

## Decisions

### D1. pnpm monorepo, three packages

`apps/web` (SvelteKit) plus two TS libraries:

- `packages/scenario` — Zod schemas, `loadOperation(id)`, the
  `validate-scenarios` CLI.
- `packages/grading` — pure functions: `scoreRun`, `aggregateRadar`,
  axis formulas in `axes.ts`.

Rationale: keeps scenario loading and grading independently testable
and lets scenario authors edit `content/` without touching SvelteKit.
Alternatives: flat single-package layout (simpler, but couples UI to
schema validation), a hex-style micro-service per console (overkill
for v1).

### D2. Scenario format is a folder of JSON / JSONL files

Each operation directory contains:

- `operation.json` — id, title, summary, difficulty, duration_minutes,
  `xp`, prerequisites, `mitre_techniques`, ordered `steps[]`.
- `steps/<n>.json` — step config: prompt, console focus,
  `expected_verdict`, `expected_mitre[]`, `expected_indicators[]`,
  `hints[]`, `hints_after_seconds`, `hints_interval_seconds`,
  `hint_penalty_percent` (see
  `specs/operations-runs/spec.md`).
- `data/alerts.jsonl` and `data/logs.jsonl` — one record per line
  with a stable id so ground-truth entries can reference them.
- `data/ground_truth.json` — the authoritative grading key.

Tracks are a single `content/tracks.json` listing each track's ordered
operation ids and `gating.threshold` integer in `0..100`
(see `specs/tracks-progression/spec.md`).

JSONL is used for alert and log streams because they grow large and
stream-friendly; a single huge JSON would be slow to parse. Schema
validation in `packages/scenario` rejects missing files, dangling ids,
or unknown MITRE technique ids (see `specs/scenario-format/spec.md`).

### D3. SQLite via Drizzle + better-sqlite3, single file

`data/app.db` is created by Drizzle migrations on first run. Drizzle
gives typed schema definitions; better-sqlite3 is synchronous and is
fast enough at scenario scale (≤ 10k events per operation).

Alternatives: libSQL / Turso (adds network dependency for local dev);
Postgres (heavy for a single-laptop learner tool).

### D4. Grading is pure functions over a run record

A run is the ordered list of step submissions

```
{
  runId,
  userId,
  operationId,
  status,
  startedAt,
  submissions: [{
    stepId,
    verdict,            // 'tp' | 'fp' | 'benign'
    note,
    mitreTags,
    startedAt,
    submittedAt,
    hintsUsed,
    consoleEvents: [...]
  }],
  finalMitre: string[],
  completedAt?
}
```

`packages/grading` exposes:

- `scoreRun(runId)` — per-axis sub-scores plus a composite.
- `aggregateRadar(userId, scope)` where `scope` is
  `'user' | 'track' | 'operation'`.

Per-axis formulas live in `packages/grading/axes.ts` as documented
functions so authors and analysts can predict and audit the scoring
(see `specs/competency-radar/spec.md`).

### D5. Shared entity model for cross-tool correlation

Every alert, log line, process, and connection references canonical
entities — `ip`, `host`, `user`, `file_hash`, `process`, `domain` —
through an `events` table plus an `entities` table populated at
scenario load. A small CLI or loader reads each `content/operations/*`
directory and writes both tables. Consoles then click through to one
another uniformly (see `specs/siem-console/spec.md`,
`specs/xdr-console/spec.md`, `specs/firewall-console/spec.md`).

Alternative: per-console indexes (faster lookups, but breaks the
"one click → all relevant evidence" promise). At scenario scale the
join cost is acceptable.

### D6. GitHub-style UI shell, not a literal GitHub clone

Visual reference only: top bar with the scenario picker and the
local user menu; left rail with *Repositories / Operations / Tracks /
Reports*; content area styled with high density, monospaced log
views, status pills. There are no actual git objects, commits, or
PRs — but an *Escalation* page can visually echo a PR view to keep
the metaphor legible to learners used to GitHub.

### D7. Local-only single user

The system creates one local user on first run, with display name
from the `BLUETEAM_EMU_USER` env var (default `"analyst"`). No
signup, login, logout, password, or session routes exist (see
`specs/local-user/spec.md`). Progress is keyed to this single id.
A `pnpm reset-user` dev script clears history.

This trims a whole class of dependencies — Lucia, OAuth, CSRF
tokens, password hashing — and keeps v1 usable as a laptop tool.
Once teams and cohorts are introduced, the `users` table is already
shaped to accept additional rows without migrations on dependent
tables (we keep `user_id` non-null but allow multiple rows).

### D8. Per-step configurable hint penalty

Each step declares `hint_penalty_percent` as an integer in `0..100`.
Each revealed hint reduces the methodology axis by that percentage
of the step's methodology weight, applied before axis normalization
(see `specs/operations-runs/spec.md`). The axis aggregate is
clamped to `0` so penalties cannot produce a sub-zero score
(see `specs/competency-radar/spec.md`).

This means scenarios can be tuned for hard graders (large penalties,
short hint delays) or forgiving graders (small penalties, long
delays) without touching code.

### D9. MITRE tagging: optional per step, required at operation end

The system accepts MITRE tags on any step at any time and uses the
step-level tags for partial-credit Jaccard grading. The system SHALL
require a non-empty operation-level MITRE tag set before the run
transitions to `completed`, so the analyst commits to a final
technique answer for the operation as a whole
(see `specs/operations-runs/spec.md` and the MITRE-grading
requirements in `specs/triage-engine/spec.md`).

## Risks / Trade-offs

- [Scenario authoring UX is rough in raw JSON] → ship Zod schemas and
  `pnpm validate-scenarios`; defer GUI editor to v2.
- [Cross-tool correlation is O(N) per click on a large operation]
  → acceptable at the ≤ 10k event target; add an `event_entities`
  join table when a scenario outgrows it.
- [Grading formulas feel arbitrary to learners] → surface the
  per-axis formula and breakdown on the report page so scoring is
  auditable.
- [Single-user model blocks legitimate shared-learning workflows]
  → out of scope for v1; data model already allows additional users.
- [SQLite write contention under shift-mode stress] → not a v1
  concern; flag for revisit when shift mode is added.
- [Hint penalty application is post-normalization, so a `100%`
  penalty completely zeros the methodology axis] → intentional and
  documented, but authors should keep
  `hint_penalty_percent` modest by default.

## Migration Plan

There is no existing system to migrate. The full first-time flow is:

1. `pnpm install`
2. `pnpm db:migrate` — creates `data/app.db` and the local user row.
3. `pnpm validate-scenarios` — confirms seed content passes.
4. `pnpm dev` — launches SvelteKit at `http://localhost:5173`.

Content updates (adding a new operation) drop files into
`content/operations/<id>/`, run the validator, and restart dev.
Schema migrations follow Drizzle's normal
`drizzle-kit generate && drizzle-kit migrate` flow. Rollback is just
`rm data/app.db` and re-running migrate.

## Open Questions

- Should the radar use raw 0..100 values or relative-to-cohort
  percentiles once teams and cohorts land? Default: raw for v1, with
  raw values persisted so a cohort view is later a query, not a
  re-grade.
- Should grading weight axes equally, or apply per-track axis
  weights? Default: equal, with weights stored on the track so a
  future iteration can override.
- Should the `pnpm reset-user` script also reseed sample runs so the
  developer can see a populated dashboard immediately, or wipe to a
  blank state? Default: blank reset, with a separate
  `pnpm seed-demo` script for the demo path.
- Authoring language for scenario content — JSONL for events, JSON
  for everything else. If non-engineers struggle, we may revisit
  YAML via a converter rather than a runtime dependency.
