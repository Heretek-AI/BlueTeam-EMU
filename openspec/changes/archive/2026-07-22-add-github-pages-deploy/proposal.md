## Why

BlueTeam-EMU currently requires `pnpm dev` and a local SQLite file to
run. That keeps it locked to a developer laptop and makes sharing it
with a class or a cohort awkward. We want it to live on a public URL
so anyone with a browser can open the simulator and start a run, with
no install, no server, and no account.

GitHub Pages is the right host for this: it's free, already attached
to the repo, and the app is small enough (a handful of routes, a few
hundred KB of scenario JSON) that a static build can serve it
comfortably. This change re-plattorms the existing SvelteKit app to
run fully client-side.

## What Changes

- Swap `@sveltejs/adapter-node` for `@sveltejs/adapter-static` and
  prerender every route. Add `paths.base = '/BlueTeam-EMU'` and a
  `404.html` SPA fallback so deep links work on GitHub Pages.
- Replace `better-sqlite3` + Drizzle with `sql.js` (WASM SQLite) +
  IndexedDB. The Drizzle schema is conceptually preserved; the app
  reads and writes rows through a small `packages/browser-db` module
  instead of `apps/web/src/lib/server/db`.
- Replace all ten `apps/web/src/routes/api/**/+server.ts` endpoints
  and six `apps/web/src/routes/**/+page.server.ts` loaders with
  client-side modules under `apps/web/src/lib/client/`.
- Bundle `content/` into `static/content/` at build time, after
  running the existing `pnpm validate-scenarios` step. The browser
  fetches the validated JSON directly — no network calls needed for
  scenarios beyond the static assets themselves.
- Move the local user record from SQLite to IndexedDB. Display name
  is editable from `/profile`. `BLUETEAM_EMU_USER` becomes a
  dev-only fallback for the initial row.
- Add a GitHub Actions workflow that builds the app on every push
  to `main`, runs `pnpm validate-scenarios`, `pnpm test`, and
  `pnpm build`, then publishes `apps/web/build/` to a `gh-pages`
  branch. URL: `https://heretek-ai.github.io/BlueTeam-EMU/`.
- Add an optional "Link a GitHub account" affordance on `/profile`:
  paste a fine-grained PAT to fetch scenario content from a private
  repo. The token is stored only in `localStorage` and used only
  for `raw.githubusercontent.com` reads. No OAuth flow.

## Capabilities

### New Capabilities

- `static-build-config`: adapter-static, prerender, base path, SPA
  fallback, asset paths for project pages.
- `browser-db`: sql.js + IndexedDB persistence layer; schema parity
  with the Drizzle schema; migration path for existing local users.
- `static-content-loader`: build-time bundling of `content/` into
  `static/`, pre-validated by the existing scenario validator.
- `pages-deploy`: GitHub Actions workflow, `gh-pages` branch, HTTPS.
- `local-user-client`: IndexedDB-backed user row, editable display
  name, optional GitHub PAT field.

### Modified Capabilities

- `local-user`: display name now persisted in IndexedDB; env var
  becomes a dev-only fallback; PAT paste is additive and optional.
- `operations-runs`: run lifecycle endpoints removed; equivalent
  functions live in `apps/web/src/lib/client/runs.ts`. Step gating
  and MITRE capture unchanged in behavior.
- `siem-console`: search/saved endpoints replaced by client-side
  sql.js queries.
- `xdr-console`: timeline endpoint replaced by client-side queries.
- `firewall-console`: search endpoint replaced by client-side queries.
- `competency-radar`: aggregations read from the browser-db.
- `tracks-progression`: track aggregations read from the browser-db.
- `scenario-format`: validation stays in CI/build; the browser skips
  network checks on pre-validated payloads.

## Impact

- Removed:
  - `apps/web/src/lib/server/**` (db client, localUser, migrate, seed)
  - `apps/web/src/routes/api/**` (all endpoints)
  - `apps/web/src/routes/**/+page.server.ts` (loaders converted)
  - `apps/web/src/hooks.server.ts`
- New:
  - `packages/browser-db/` — sql.js + IndexedDB layer
  - `apps/web/src/lib/client/` — query layer replacing the API
  - `apps/web/static/content/` — bundled scenario JSON
  - `apps/web/static/404.html` — SPA fallback
  - `.github/workflows/deploy.yml` — GitHub Pages CI
  - `packages/browser-db/test/` — round-trip persistence tests
- Dependencies added: `sql.js`, `@sveltejs/adapter-static`, plus a
  small IndexedDB helper (no new framework).
- Dependencies removed: `better-sqlite3`, `drizzle-orm`,
  `drizzle-kit`, `@sveltejs/adapter-node`. Drizzle remains for
  reference only in the schema file (not used at runtime).
- Out of scope: webhooks, OAuth, marketplace, cross-device sync,
  multi-user teams, mobile-first layout, and anything that would
  require a backend.
