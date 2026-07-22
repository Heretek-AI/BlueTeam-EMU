# BlueTeam-EMU

A GitHub-style webapp SOC simulator: realistic alert triage and
incident investigation guided by operations and learning tracks,
graded across an eight-axis competency radar.

**Live at:** <https://heretek-ai.github.io/BlueTeam-EMU/>

## Why

Aspiring and junior SOC analysts need a low-cost, low-friction way to
practice real alert-triage and incident-investigation workflows against
realistic SIEM, XDR, and Firewall telemetry before they touch a
production queue.

## Local-only single user

This project ships a **single local user** — no signup, no login, no
session management. On first load the system creates a local user row
with the display name `"analyst"` (or the `BLUETEAM_EMU_USER` env
variable in dev). Change it anytime from the profile page.

An optional **GitHub personal access token** can be pasted on the
profile page to enable private-repo scenario sync. The token is
stored only in `localStorage` and is never sent to any server.

A **Clear all data** button on the profile page deletes all runs,
saved searches, and settings from IndexedDB.

## Quick start (development)

Requires Node ≥ 22 and pnpm ≥ 10.

```bash
pnpm install
pnpm validate-scenarios    # validates seed content (4 operations, 2 tracks)
pnpm test                  # 4+5+12 unit tests across scenario, grading, browser-db
pnpm build                 # static build for production
pnpm bundle-content        # bundles content + sql-wasm.wasm into static/
pnpm dev                   # local preview at http://localhost:5173/BlueTeam-EMU/
```

For the live deploy, push to `main` — a GitHub Actions workflow
builds and publishes to the `gh-pages` branch automatically.

## Repository layout

```
apps/web                 # SvelteKit UI (static build)
packages/scenario        # Zod schemas and JSON scenario loaders
packages/grading         # Pure scoring functions + axis formulas
packages/browser-db      # sql.js + IndexedDB persistence layer
content/                 # Operation and track JSON content
openspec/                # OpenSpec change artifacts
```

## Scripts

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `pnpm dev`               | Start the SvelteKit dev server.                         |
| `pnpm build`             | Static build to `apps/web/build/`.                      |
| `pnpm test`              | Run Vitest suites across all packages.                  |
| `pnpm lint`              | Run ESLint where configured.                            |
| `pnpm validate-scenarios`| Walk `content/` and validate every operation + track.   |
| `pnpm bundle-content`    | Copy validated content and sql-wasm.wasm into `static/`.|
| `pnpm verify`            | Run lint + typecheck + tests + validator + bundle.      |

## Competency radar

Every run produces scores on eight axes:

- `speed`, `accuracy`, `correlation`, `methodology`,
  `detectionCoverage`, `documentation`, `timeToFirstAction`,
  `pressure`.

See `packages/grading/src/axes.ts` for the formulas and
`openspec/changes/add-blueteam-emu/specs/competency-radar/spec.md`
for the contract.

## Seeded content

- **4 operations**: phishing-credential-theft, mfa-fatigue,
  lumma-stealer-drop, kerberoasting
- **2 tracks**: SOC Analyst Foundations (threshold 60),
  2026 Infostealers (threshold 70)

## Out of scope (v1)

- Real telemetry ingestion (Splunk, Elastic, Defender).
- Multi-tenant teams / cohorts / leaderboards.
- Payment, SSO, OAuth, AI hints.
- Mobile-first layout (desktop ≥ 1024px).
- Cross-device sync (all state stays in one browser profile).
