# BlueTeam-EMU

A GitHub-style webapp SOC simulator: realistic alert triage and
incident investigation guided by operations and learning tracks,
graded across an eight-axis competency radar.

## Why

Aspiring and junior SOC analysts need a low-cost, low-friction way to
practice real alert-triage and incident-investigation workflows against
realistic SIEM, XDR, and Firewall telemetry before they touch a
production queue.

## Local-only single user

This project ships a **single local user** — no signup, no login, no
session management. On first run the system creates a local user row
with the display name from `BLUETEAM_EMU_USER` (default `analyst`).
Reset it anytime with `pnpm reset-user`.

## Quick start

Requires Node ≥ 20 and pnpm ≥ 10.

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm validate-scenarios
pnpm dev
```

Open <http://localhost:5173>.

## Scripts

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `pnpm dev`               | Start the SvelteKit dev server.                         |
| `pnpm build`             | Build the web app.                                      |
| `pnpm typecheck`         | Run `tsc --noEmit` across the workspace.                |
| `pnpm test`              | Run Vitest suites.                                      |
| `pnpm lint`              | Run ESLint where configured.                            |
| `pnpm validate-scenarios`| Walk `content/` and validate every operation + track.   |
| `pnpm db:migrate`        | Apply Drizzle migrations to `data/app.db`.              |
| `pnpm db:seed`           | Hydrate `events` and `entities` from `content/`.        |
| `pnpm reset-user`        | Reset the local user display name and clear run history.|
| `pnpm verify`            | Run lint + typecheck + tests + validator.               |

## Repository layout

```
apps/web                 # SvelteKit UI + server
packages/scenario        # Zod schemas and JSON scenario loaders
packages/grading         # Pure scoring functions + axis formulas
content/                 # Operation and track JSON content
data/                    # SQLite database (gitignored)
openspec/                # OpenSpec change artifacts
```

## Competency radar

Every run produces scores on eight axes:

- `speed`, `accuracy`, `correlation`, `methodology`,
  `detectionCoverage`, `documentation`, `timeToFirstAction`,
  `pressure`.

See `packages/grading/src/axes.ts` for the formulas and
`openspec/changes/add-blueteam-emu/specs/competency-radar/spec.md`
for the contract.

## Out of scope (v1)

- Real telemetry ingestion (Splunk, Elastic, Defender).
- Multi-tenant teams / cohorts / leaderboards.
- Payment, SSO, OAuth, AI hints.
- Mobile-first layout (desktop ≥ 1024px).
