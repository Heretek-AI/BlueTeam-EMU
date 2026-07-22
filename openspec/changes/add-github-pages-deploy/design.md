## Context

BlueTeam-EMU v1 (`add-blueteam-emu`) runs as a local SvelteKit app
with `better-sqlite3` + Drizzle. That keeps it locked to a developer
laptop: `pnpm dev`, a local SQLite file, and a `data/` directory.
The goal here is to host the same app as a static site on GitHub
Pages so anyone with a browser can open it and start a run — no
install, no server, no account.

This change is a replatforming, not a rewrite. The SvelteKit UI,
the scenario format, the grading engine, and the seeded content are
all preserved. What changes is *where* the data lives and *how* the
app is built and deployed.

Constraints from answers:

- Target: GitHub Pages as a static SvelteKit build via
  `@sveltejs/adapter-static`.
- Client persistence: `sql.js` (WASM SQLite) + IndexedDB.
- User model: single local user, display name from `localStorage`
  (env var still works in dev). Optional GitHub PAT paste for
  private-repo scenario sync — stored only in `localStorage`.
- Deploy: GitHub Actions workflow builds on every push to `main`
  and publishes to a `gh-pages` branch (root).
- No webhooks, no marketplace, no OAuth, no backend.

## Goals / Non-Goals

**Goals**

- The app builds to a fully static `apps/web/build/` directory with
  no Node server.
- All ten `+server.ts` endpoints and six `+page.server.ts` loaders
  are replaced by client-side modules under `apps/web/src/lib/client/`.
- `sql.js` + IndexedDB replaces `better-sqlite3` + Drizzle. The
  schema is preserved; queries are rewritten as plain SQL against
  sql.js.
- `content/` is bundled at build time into `static/content/` after
  `pnpm validate-scenarios` passes.
- A GitHub Actions workflow builds and deploys to `gh-pages` on
  every push to `main`.
- The site loads at
  `https://heretek-ai.github.io/BlueTeam-EMU/`.

**Non-Goals**

- Webhooks, OAuth, marketplace, cross-device sync, multi-user
  teams, mobile-first layout, or anything that requires a backend.
- A scenario editor in the browser (content is still authored in
  the repo and validated by CI).
- Real-time collaboration or shared leaderboards.

## Decisions

### D1. Adapter-static with `paths.base = '/BlueTeam-EMU'`

`@sveltejs/adapter-static` prerenders every route to `.html`. The
`paths.base` must match the GitHub Pages project URL path
(`/BlueTeam-EMU`) so asset references and internal links resolve
correctly. A `404.html` at the root of the build output serves as
the SPA fallback: GitHub Pages returns it for any unmatched path,
and the SvelteKit router takes over.

Alternative: `adapter-node` behind a tiny server. Rejected because
it defeats the purpose of GitHub Pages.

### D2. sql.js + IndexedDB replaces better-sqlite3 + Drizzle

`sql.js` is a WebAssembly build of SQLite that runs in the browser.
It provides the same SQL surface as better-sqlite3, so the schema
and queries can be ported with minimal changes. The entire database
is serialized to IndexedDB after every write; on reload, the app
deserializes and continues.

Drizzle is dropped entirely. The schema file remains as reference
documentation only. Queries are written as plain SQL strings in
`apps/web/src/lib/client/`.

Alternative: IndexedDB via Dexie with no SQL. Rejected because it
forces a rewrite of every query and drifts from the spec.

### D3. Client-side query layer in `apps/web/src/lib/client/`

The ten API endpoints and six loaders are replaced by six modules:

- `client/db.ts` — sql.js init, IndexedDB persistence, migration
- `client/localUser.ts` — user row, display name, PAT
- `client/siem.ts` — `searchLogs`, saved-search CRUD
- `client/xdr.ts` — `getEntityTimeline`
- `client/firewall.ts` — `searchConnections`
- `client/runs.ts` — `startRun`, `pauseRun`, `resumeRun`,
  `submitStep`, `completeRun`
- `client/tracks.ts` — `listTracks`, `getTrackProgress`
- `client/radar.ts` — `aggregateRadar`

Each function is async and returns the same shape as the endpoint it
replaces. The Svelte components import these directly instead of
calling `fetch('/api/...')`.

### D4. Content bundling at build time

A small `scripts/bundle-content.ts` runs before the SvelteKit build:
1. Run `pnpm validate-scenarios` on `content/`.
2. Copy `content/operations/` and `content/tracks.json` into
   `apps/web/static/content/`.
3. Fail the build if validation fails.

The browser fetches scenario JSON from
`/BlueTeam-EMU/content/operations/<id>/` and
`/BlueTeam-EMU/content/tracks.json`. No Zod validation at runtime.

### D5. GitHub Actions deploy workflow

`.github/workflows/deploy.yml`:

1. Checkout `main`.
2. `pnpm install --frozen-lockfile`.
3. `pnpm validate-scenarios`.
4. `pnpm test` (scenario + grading packages).
5. `pnpm --filter @blueteam-emu/web build`.
6. Publish `apps/web/build/` to `gh-pages` branch root using
   `peaceiris/actions-gh-pages@v4`.

The `gh-pages` branch contains only built assets; `main` never
contains build artifacts.

### D6. Local user model in IndexedDB

The `users` table in sql.js holds exactly one row. Display name is
editable from `/profile`. `BLUETEAM_EMU_USER` is a dev-only fallback
for the initial row; in production, the name comes from
`localStorage.getItem('blueteam-emu:display-name')` or `"analyst"`.

An optional "Link a GitHub account" field on `/profile` accepts a
fine-grained PAT. The token is stored only in
`localStorage.getItem('blueteam-emu:github-pat')` and is used only
for `raw.githubusercontent.com` fetches when syncing scenarios from
a private repo. No OAuth flow exists.

A "Clear all data" button on `/profile` deletes the IndexedDB
database and reloads the page, returning to a fresh state.

### D7. Schema parity with the Drizzle schema

The sql.js schema is a direct SQL translation of
`apps/web/src/lib/server/db/schema.ts`. Table names, column names,
primary keys, foreign keys, and defaults are preserved. The only
differences are:

- `integer` columns stay `INTEGER` (SQLite native).
- `text` columns stay `TEXT`.
- `json` columns stay `TEXT` with JSON serialized by the app.
- No Drizzle-specific defaults (e.g., `$defaultFn`) — defaults are
  applied in the SQL or by the client code.

A migration path exists for future schema changes: a `meta` table
stores `schema_version`, and a `migrate()` function in
`client/db.ts` applies idempotent ALTERs.

### D8. SPA fallback via `404.html`

SvelteKit's adapter-static generates a `404.html` when
`fallback: '404.html'` is set in `svelte.config.js`. GitHub Pages
serves this file for any unmatched path, and the SvelteKit router
takes over. This allows deep links like
`/BlueTeam-EMU/operations/phishing-credential-theft` to work on a
fresh page load.

## Risks / Trade-offs

- [sql.js bundle size] → ~1.5MB wasm; acceptable for a dev tool,
  not for a phone. Defer mobile.
- [IndexedDB quota] → modern browsers give plenty; we surface a
  "Clear all data" affordance on `/profile`.
- [SPA fallback correctness] → `paths.base` must match the repo
  name exactly; a mismatch breaks asset loading. We test this in
  CI by curling the built `404.html` and checking for
  `/BlueTeam-EMU/_app/` references.
- [No cross-device sync] → all state is in one browser profile.
  That is the v1 model and is documented.
- [sql.js performance on large datasets] → scenario scale (≤ 10k
  events) is fine; we add a `LIMIT` to every query and avoid
  full-table scans.
- [PAT stored in localStorage] → a malicious script on the same
  origin could read it. We mitigate by storing only the PAT (no
  refresh token), using a fine-grained PAT with read-only scope,
  and documenting the risk on `/profile`.
- [Build-time content bundling] → stale content if `content/` is
  edited but not committed. The CI workflow runs on every push to
  `main`, so the deployed site always matches the repo state.

## Migration Plan

There is no existing deployment to migrate. The first-time flow is:

1. Merge this change to `main`.
2. The GitHub Actions workflow runs and publishes to `gh-pages`.
3. Enable GitHub Pages in repo settings: source = `gh-pages` branch,
   root.
4. Visit `https://heretek-ai.github.io/BlueTeam-EMU/`.

Rollback: revert the commit, disable GitHub Pages, or delete the
`gh-pages` branch.

For existing local dev users: the `pnpm dev` flow still works
because the client-side modules are imported by the same Svelte
components. The only difference is that `pnpm dev` now serves the
static build instead of the Node server.

## Open Questions

- Should we support a custom domain? Default: no, but the workflow
  supports adding a `CNAME` file to `gh-pages` later.
- Should we cache the sql.js wasm file in a service worker for
  offline use? Default: no for v1; the app requires an initial
  load to fetch the wasm and content JSON.
- Should we add a "Share run" feature that exports a run as JSON?
  Default: no for v1; the data model already supports it if we
  add a download button later.
- Should we keep the `packages/browser-db` package separate from
  `apps/web/src/lib/client/`? Default: yes for v1, so the browser-db
  layer is independently testable. We may merge them later if the
  split becomes awkward.
