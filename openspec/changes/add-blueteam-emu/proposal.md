## Why

Aspiring and junior SOC analysts need a low-cost, low-friction way to
practice real alert-triage and incident-investigation workflows against
realistic SIEM, XDR, and Firewall telemetry before they touch a
production queue. Today the best options (SOCSimulator.com, TryHackMe
SOC-sim) are paid, CTF-flavored, or treat blue-team work as a side-mode
of an offensive platform. BlueTeam-EMU fills that gap with a
GitHub-style webapp — issues-as-alerts, repos-as-cases — where a single
learner can run guided operations, follow learning tracks, and receive
a competency radar showing measurable progress across eight analyst
axes. We have an empty repo and a clear scope, so this is the right
moment to lay down the foundation.

## What Changes

- New SvelteKit + SQLite webapp at the repo root with a GitHub-style UI
  shell (left rail: Repositories / Operations / Tracks / Reports; top
  bar: scenario picker and local user menu; command palette for log
  search).
- Canonical on-disk scenario format: each operation is a folder of
  JSON files (operation metadata, steps, alerts, log lines, IOCs,
  ground-truth grading key, MITRE mappings) loaded by the engine.
  Validation via Zod schemas.
- Three core consoles reachable from any operation:
  - **SIEM console**: faceted log search, saved searches, event detail
    drawer.
  - **XDR console**: process tree and entity timeline for a host.
  - **Firewall console**: connection table with filters by
    src / dst / port / ASN / time window.
- **Operations** as guided investigations with ordered steps. Each step
  collects a verdict (TP / FP / Benign), an optional note, an optional
  MITRE tag (required at operation end), and records the analyst's
  console events.
- **Tracks** as ordered sequences of operations that gate progression
  on passing scores; first two tracks seeded.
- **Grading engine** that converts run records into 8-axis scores and
  persists per-user, per-operation, per-track aggregates.
- **Competency radar** SVG component rendered on the report page.
- **Local-only single user**: no signup, no login, no Lucia; one local
  user created on first run, profile editable, dev-only reset script.
- Seed dataset of 4 operations across the first two tracks:
  *Phishing → Credential Theft*, *MFA Fatigue*, *Lumma Stealer Drop*,
  *Kerberoasting*.

## Capabilities

### New Capabilities

- `scenario-format`: canonical folder-of-JSON format for operations,
  tracks, alerts, log lines, ground-truth keys, MITRE mappings, with
  Zod validation and a CLI validator.
- `triage-engine`: verdict submission, MITRE grading, note grading,
  deterministic scoring, run-record persistence.
- `siem-console`: faceted log search, saved searches, event detail
  drawer, entity link-outs to XDR and Firewall.
- `xdr-console`: process tree and entity timeline for a host, with
  entity link-outs.
- `firewall-console`: connection table with filters and entity
  link-outs.
- `operations-runs`: operation start / pause / resume, step gating,
  prerequisite enforcement, hint reveal with per-step configurable
  percent penalty, MITRE capture required at operation end.
- `tracks-progression`: track enrollment, ordered gating by passing
  score, completion badge persistence.
- `competency-radar`: server-side aggregation across the eight axes,
  normalization to 0..100, per-track and per-user views.
- `local-user`: single local user record created on first run from
  `BLUETEAM_EMU_USER` env var (default `"analyst"`), editable display
  name, no signup or login routes.

### Modified Capabilities

- *(none — greenfield repo)*

## Impact

- New repository contents:
  - `apps/web/` SvelteKit app (routes, components, lib/server).
  - `packages/scenario/` TypeScript library: Zod schemas, loaders, CLI
    validator.
  - `packages/grading/` TypeScript library: pure scoring functions and
    axis formulas.
  - `content/operations/`, `content/tracks/` seed JSON scenarios and
    `tracks.json`.
  - `data/app.db` SQLite file (gitignored, generated on first run by
    Drizzle migrations).
- New top-level files: `package.json` (pnpm workspace), `README.md`,
  `.gitignore`, `drizzle.config.ts`, `tsconfig.json`, `vite.config.ts`,
  `.env.example`.
- New external dependencies:
  - Runtime: `@sveltejs/kit`, `svelte`, `better-sqlite3`, `drizzle-orm`,
    `zod`, `vitest`, `@playwright/test`, plus a small charting library
    for the radar (e.g. `chart.js` or hand-rolled SVG).
  - Tooling: `pnpm`, `drizzle-kit`, `eslint`, `prettier`, `typescript`,
    `@sveltejs/adapter-node`.
  - Deliberately **not** introduced: Lucia / auth libraries, payment
    SDKs, OAuth clients, ML / AI SDKs, Docker.
- No breaking changes — the repo is empty.
- Explicitly **out of scope** for this change (called out so reviewers
  do not expect them): real telemetry ingestion (Splunk, Elastic,
  Defender), multi-user teams / cohorts, payment or billing,
  SSO / SAML, AI hints, scenario marketplace, mobile-first layout.
