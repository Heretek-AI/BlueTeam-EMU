## ADDED Requirements

### Requirement: Adapter is static and all routes are prerendered

The system SHALL use `@sveltejs/adapter-static` in
`apps/web/svelte.config.js` and SHALL prerender every route. The build
SHALL produce a `build/` directory containing only static assets —
HTML, CSS, JS, JSON, and `404.html` — with no Node server.

#### Scenario: Build produces only static assets
- **WHEN** `pnpm --filter @blueteam-emu/web build` runs successfully
- **THEN** `apps/web/build/` contains only static files and no
  `server/` or `worker/` directories are present

#### Scenario: All routes are prerendered
- **WHEN** the build completes
- **THEN** every route reachable from the left rail and the operation
  detail page has a corresponding `.html` file in `build/`

### Requirement: Base path matches the GitHub Pages project URL

The system SHALL set `paths.base` to `/BlueTeam-EMU` in
`apps/web/svelte.config.js` so that all internal links, asset
references, and fetch calls resolve correctly under
`https://heretek-ai.github.io/BlueTeam-EMU/`.

#### Scenario: Asset paths include the base
- **WHEN** the built HTML references a JS or CSS asset
- **THEN** the `src` or `href` begins with `/BlueTeam-EMU/`

#### Scenario: Deep link resolves
- **WHEN** a user navigates directly to
  `https://heretek-ai.github.io/BlueTeam-EMU/operations/phishing-credential-theft`
- **THEN** the page loads without a 404 and the router resolves the
  path correctly

### Requirement: SPA fallback is provided via `404.html`

The system SHALL include a `404.html` file at the root of the build
output that loads the SvelteKit app shell. GitHub Pages SHALL serve
this file for any unmatched path, allowing the client-side router to
take over.

#### Scenario: Unknown path serves the app shell
- **WHEN** a user visits a path that has no matching `.html` file
- **THEN** GitHub Pages serves `404.html`, which loads the app and
  lets the router handle the path

### Requirement: No server-only files are included in the build

The system SHALL exclude all files under `apps/web/src/lib/server/`
from the build. The build SHALL fail if any import chain from a
prerendered route reaches a server-only module.

#### Scenario: Build fails on server-only import
- **WHEN** a `.svelte` or `.ts` file in `src/lib/` imports from
  `$lib/server/`
- **THEN** the build fails with a clear error naming the offending
  import

#### Scenario: Clean build excludes server files
- **WHEN** the build completes successfully
- **THEN** no file in `build/` contains code from
  `apps/web/src/lib/server/`
