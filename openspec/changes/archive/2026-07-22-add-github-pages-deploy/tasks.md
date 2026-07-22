## 1. Static-build prep

- [x] 1.1 Swap `@sveltejs/adapter-node` for `@sveltejs/adapter-static`
  in `apps/web/svelte.config.js` and set `fallback: '404.html'`
- [x] 1.2 Set `paths.base = '/BlueTeam-EMU'` in
  `apps/web/svelte.config.js`
- [x] 1.3 Add `prerender: { entries: ['*'] }` in
  `apps/web/svelte.config.js` so every route is prerendered
- [x] 1.4 Remove `apps/web/src/lib/server/` (db client, localUser,
  migrate, seed, seed-mitre) and `apps/web/src/hooks.server.ts`
- [x] 1.5 Remove all `apps/web/src/routes/api/**` endpoints and all
  `apps/web/src/routes/**/+page.server.ts` loaders
- [x] 1.6 Remove `better-sqlite3`, `drizzle-orm`, `drizzle-kit`,
  `@sveltejs/adapter-node` from `apps/web/package.json`
- [x] 1.7 Add `sql.js` and `@sveltejs/adapter-static` to
  `apps/web/package.json`

## 2. Browser-db package

- [x] 2.1 Create `packages/browser-db/` with `package.json`,
  `tsconfig.json`, and `src/index.ts`
- [x] 2.2 Implement `initDb()` in `packages/browser-db/src/db.ts`:
  loads sql.js wasm, opens or creates the database, applies the
  schema, and returns a handle
- [x] 2.3 Implement `persistDb()` in `packages/browser-db/src/db.ts`:
  serializes the database to IndexedDB after every write
- [x] 2.4 Implement the SQL schema in
  `packages/browser-db/src/schema.ts` matching the Drizzle schema
  (users, operations, tracks, track_operations, enrollments,
  track_completions, runs, step_submissions, saved_searches,
  entities, events, event_entities, firewall_events,
  mitre_techniques)
- [x] 2.5 Implement `migrate()` in `packages/browser-db/src/db.ts`:
  reads `meta.schema_version`, applies idempotent ALTERs, and
  updates the version
- [x] 2.6 Implement `clearAllData()` in
  `packages/browser-db/src/db.ts`: deletes the IndexedDB database
  and reloads the page
- [x] 2.7 Add Vitest tests in `packages/browser-db/test/` covering
  init, write, persist, reload, and clear-all-data

## 3. Content bundling

- [x] 3.1 Add `scripts/bundle-content.ts` that runs
  `pnpm validate-scenarios` on `content/` and copies the validated
  files into `apps/web/static/content/`
- [x] 3.2 Wire `bundle-content` into the `prebuild` step of
  `apps/web/package.json`
- [x] 3.3 Add a `pnpm bundle-content` script at the repo root
- [x] 3.4 Verify that `apps/web/build/content/` matches `content/`
  after a successful build

## 4. Client local user

- [x] 4.1 Implement `ensureLocalUser()` in
  `apps/web/src/lib/client/localUser.ts`: creates the user row in
  sql.js on first load with display name from
  `localStorage.getItem('blueteam-emu:display-name')` or
  `"analyst"`
- [x] 4.2 Implement `getLocalUser()` and `setLocalDisplayName()` in
  `apps/web/src/lib/client/localUser.ts`
- [x] 4.3 Implement `getGithubPat()` and `setGithubPat()` in
  `apps/web/src/lib/client/localUser.ts` (stored in
  `localStorage` under `blueteam-emu:github-pat`)
- [x] 4.4 Update `/profile` page to read from and write to the
  client-side user store, add PAT field, and add "Clear all data"
  button
- [x] 4.5 Remove `/api/profile` endpoint

## 5. Client query layer

- [x] 5.1 Implement `apps/web/src/lib/client/db.ts`: re-exports
  `initDb`, `persistDb`, `clearAllData` from `@blueteam-emu/browser-db`
  and adds a `getDb()` singleton
- [x] 5.2 Implement `apps/web/src/lib/client/siem.ts`:
  `searchLogs({ operationId, filters, limit })`,
  `listSavedSearches()`, `createSavedSearch(name, query)`,
  `deleteSavedSearch(id)`
- [x] 5.3 Implement `apps/web/src/lib/client/xdr.ts`:
  `getEntityTimeline(operationId, host, kinds)`
- [x] 5.4 Implement `apps/web/src/lib/client/firewall.ts`:
  `searchConnections({ operationId, srcIp, dstIp, dport, asn,
  fromTs, toTs, limit })`
- [x] 5.5 Implement `apps/web/src/lib/client/runs.ts`:
  `startRun(operationId)`, `pauseRun(runId)`, `resumeRun(runId)`,
  `submitStep(runId, { stepId, verdict, note, mitreTags,
  hintsUsed, startedAt })`, `completeRun(runId, finalMitre)`
- [x] 5.6 Implement `apps/web/src/lib/client/tracks.ts`:
  `listTracks()`, `getTrackProgress(trackId)`, `enroll(trackId)`
- [x] 5.7 Implement `apps/web/src/lib/client/radar.ts`:
  `aggregateRadar(scope)` reading from the sql.js database
- [x] 5.8 Update all Svelte components to import from
  `$lib/client/**` instead of calling `fetch('/api/...')`
- [x] 5.9 Update all `+page.ts` loaders to read from the client-side
  modules instead of `+page.server.ts`

## 6. Grading + radar + tracks rewiring

- [x] 6.1 Verify that `packages/grading` needs no changes (it is
  already pure)
- [x] 6.2 Wire `completeRun` in `apps/web/src/lib/client/runs.ts`
  to call `scoreRun` from `@blueteam-emu/grading` and store the
  result in the `runs` table
- [x] 6.3 Wire `aggregateRadar` in `apps/web/src/lib/client/radar.ts`
  to read run records from the sql.js database and call
  `aggregateRadar` from `@blueteam-emu/grading`
- [x] 6.4 Wire `getTrackProgress` in
  `apps/web/src/lib/client/tracks.ts` to read from the sql.js
  database and compute pass/fail state per track

## 7. GitHub Pages CI

- [x] 7.1 Add `.github/workflows/deploy.yml` that triggers on push
  to `main`, runs `pnpm install --frozen-lockfile`,
  `pnpm validate-scenarios`, `pnpm test`, `pnpm build`, and
  publishes `apps/web/build/` to `gh-pages`
- [x] 7.2 Add a `CNAME` placeholder comment in the workflow for
  future custom domain support
- [x] 7.3 Enable GitHub Pages in repo settings: source = `gh-pages`
  branch, root (manual — must be done in repo settings after first deploy)
- [x] 7.4 Verify the deployed site loads at
  `https://heretek-ai.github.io/BlueTeam-EMU/` (after first CI run)

## 8. Quality gates

- [x] 8.1 Add Vitest tests for `packages/browser-db` covering init,
  write, persist, reload, and clear-all-data
- [x] 8.2 Add Playwright e2e test that loads the static build,
  starts a run, submits a step, and verifies the radar renders
- [x] 8.3 Update root `pnpm verify` to include `pnpm bundle-content`
  and `pnpm --filter @blueteam-emu/web build`
- [x] 8.4 Update `README.md` with the GitHub Pages URL, the new
  build flow, and the "Clear all data" affordance
- [x] 8.5 Confirm `pnpm verify` is green on a fresh checkout
