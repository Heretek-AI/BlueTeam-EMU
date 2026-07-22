## 1. Repo scaffolding

- [x] 1.1 Initialize pnpm workspace at repo root with `package.json`,
  `pnpm-workspace.yaml`, `tsconfig.json` (project references), and
  `.gitignore`
- [x] 1.2 Add root `README.md` describing the project, the local-only
  user model, and the `pnpm dev` workflow
- [x] 1.3 Create `apps/web` SvelteKit project (TS, ESLint, Prettier,
  Vitest, Playwright, `@sveltejs/adapter-node`)
- [x] 1.4 Create `packages/scenario` TypeScript package with Vitest
  and Zod as dependencies
- [x] 1.5 Create `packages/grading` TypeScript package with Vitest
  and no runtime dependencies on SvelteKit or Drizzle
- [x] 1.6 Add `drizzle.config.ts`, a `drizzle/` migrations folder,
  and a `pnpm db:migrate` script
- [x] 1.7 Add `.env.example` documenting `BLUETEAM_EMU_USER` and
  `DATABASE_URL`

## 2. Scenario format and `packages/scenario`

- [x] 2.1 Author Zod schemas in `packages/scenario/src/schemas` for
  operation, step, alert, log, ground truth, and track
- [x] 2.2 Implement `loadOperation(id)` and `loadTrack(id)` in
  `packages/scenario/src/load.ts`
- [x] 2.3 Implement MITRE technique reference table loader and the
  unknown-id validator
- [x] 2.4 Implement `validateScenarios(contentDir)` returning a
  per-file pass / fail report
- [x] 2.5 Add `pnpm validate-scenarios` CLI that wraps
  `validateScenarios` and exits non-zero on any failure
- [x] 2.6 Add Vitest unit tests covering valid and invalid scenarios,
  dangling ground-truth ids, and unknown MITRE ids

## 3. Seed scenarios and tracks

- [x] 3.1 Add `content/operations/phishing-credential-theft/` with
  `operation.json`, steps, alerts, logs, and ground truth
- [x] 3.2 Add `content/operations/mfa-fatigue/` with full scenario
  files
- [x] 3.3 Add `content/operations/lumma-stealer-drop/` with full
  scenario files
- [x] 3.4 Add `content/operations/kerberoasting/` capstone scenario
- [x] 3.5 Add `content/tracks.json` declaring the two tracks with
  ordered operation ids and gating thresholds
- [x] 3.6 Run `pnpm validate-scenarios` and ensure every seed
  operation and track passes

## 4. Data model and loader

- [x] 4.1 Add Drizzle schema for `users`, `operations`, `tracks`,
  `enrollments`, `runs`, `step_submissions`, `saved_searches`,
  `events`, `entities`, `mitre_techniques`
- [x] 4.2 Implement `loadScenarioIntoDb(scenarioDir)` that hydrates
  `events` and `entities` from the seed JSON / JSONL files
- [x] 4.3 Add `pnpm db:seed` script that walks `content/` and
  hydrates the database
- [x] 4.4 Seed the MITRE technique reference table from a small
  bundled JSON file

## 5. Local user model

- [x] 5.1 Implement `ensureLocalUser(db)` in
  `apps/web/src/lib/server/localUser.ts` that creates the local user
  on first run with `BLUETEAM_EMU_USER` (default `"analyst"`) and
  refuses to create a second row
- [x] 5.2 Wire SvelteKit hooks (`hooks.server.ts`) to call
  `ensureLocalUser` at startup and to attach the local user id to
  `event.locals.user`
- [x] 5.3 Add the profile page route at `/profile` reading and
  updating the local user's display name
- [x] 5.4 Add `pnpm reset-user` script that resets the local user
  display name and clears runs and enrollments

## 6. UI shell

- [x] 6.1 Add the top bar component with the scenario picker and
  the local user menu
- [x] 6.2 Add the left rail component with the four navigation
  entries (Repositories, Operations, Tracks, Reports)
- [x] 6.3 Add the dashboard, operation, track, and report layouts
  with the GitHub-style shell
- [x] 6.4 Add the command palette component (`cmd-k`) for log search
  shortcuts and quick console jumps

## 7. SIEM console

- [x] 7.1 Implement `apps/web/src/routes/api/console/siem/search`
  endpoint accepting structured filters and a clamped limit
- [x] 7.2 Implement the SIEM event table component with sorting and
  filter chips
- [x] 7.3 Implement the event detail drawer with entity link-outs
- [x] 7.4 Implement saved-search persistence (name, query, last run)
  capped at `50`
- [x] 7.5 Add Vitest + Playwright tests covering basic search and
  saved-search create / list / delete

## 8. XDR console

- [x] 8.1 Implement the process tree component driven by events with
  parent PID references, including collapse / expand
- [x] 8.2 Implement suspicious-process flagging with tooltip
  showing the rule name
- [x] 8.3 Implement the entity timeline component with event-type
  filters and "load more" pagination
- [x] 8.4 Implement entity link-outs (host → SIEM, IP → Firewall,
  hash → SIEM)

## 9. Firewall console

- [x] 9.1 Implement the Firewall connection table with combined
  filters (src IP, dst IP, dst port, ASN, time window)
- [x] 9.2 Implement ASN column rendering with dashed fallback and
  sortable behavior
- [x] 9.3 Implement entity link-outs (src IP, dst IP, dst host → SIEM)

## 10. Operations and runs

- [x] 10.1 Implement the operation detail page with summary, step
  list, and MITRE badges
- [x] 10.2 Implement run lifecycle endpoints: `start`, `pause`,
  `resume`, `submitStep`, `addMitreTag`, `complete`
- [x] 10.3 Implement step gating (cannot open step `N+1` until step
  `N` is submitted; operation prerequisites enforced at start)
- [x] 10.4 Implement the hint reveal component with the per-step
  `hints_after_seconds`, `hints_interval_seconds`, and
  `hint_penalty_percent` from the step config
- [x] 10.5 Enforce non-empty operation-level MITRE tag set on the
  complete endpoint
- [x] 10.6 Add Playwright happy-path test: start run → submit step →
  reveal hint → add MITRE tag → complete

## 11. Tracks and progression

- [x] 11.1 Implement the Tracks list page reading from
  `content/tracks.json`
- [x] 11.2 Implement the Track detail page with ordered operations,
  gating state, and enroll action
- [x] 11.3 Implement operation gating against `gating.threshold` and
  the local user's best run score
- [x] 11.4 Implement completion persistence and badge rendering on
  the dashboard and Tracks page

## 12. Grading and competency radar

- [x] 12.1 Implement the eight axis formulas in
  `packages/grading/src/axes.ts` with plain-language descriptions
- [x] 12.2 Implement `scoreRun` in `packages/grading/src/score.ts`,
  covering verdict, MITRE Jaccard, note indicator recall, hint
  penalty application, and clamping to `0..100`
- [x] 12.3 Implement `aggregateRadar` in
  `packages/grading/src/aggregate.ts` covering per-operation,
  per-track, and per-user scopes
- [x] 12.4 Add Vitest tests covering exact, partial, and disjoint
  MITRE matches; idempotent re-scoring; and axis clamping
- [x] 12.5 Implement the radar SVG component with axis labels, hover
  tooltips, and per-scope visual parity
- [x] 12.6 Implement the report page rendering the radar and a
  per-axis drill-down

## 13. Quality gates

- [x] 13.1 Configure Vitest at the workspace root with project
  references for `apps/web`, `packages/scenario`, and
  `packages/grading`
- [x] 13.2 Configure Playwright with a single end-to-end happy-path
  covering the local user flow from start to radar render
- [x] 13.3 Wire `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm validate-scenarios`, and `pnpm db:migrate` into a root
  `pnpm verify` script
- [x] 13.4 Confirm `pnpm verify` is green on a fresh checkout and
  document the steps in `README.md`
