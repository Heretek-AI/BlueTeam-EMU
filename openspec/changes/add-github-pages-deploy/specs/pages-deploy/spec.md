## ADDED Requirements

### Requirement: GitHub Actions workflow builds and deploys

The system SHALL include a `.github/workflows/deploy.yml` workflow
that triggers on every push to `main`. The workflow SHALL run
`pnpm install`, `pnpm validate-scenarios`, `pnpm test`, and
`pnpm build`, then publish `apps/web/build/` to a `gh-pages` branch.

#### Scenario: Workflow runs on push to main
- **WHEN** a commit is pushed to `main`
- **THEN** the workflow starts and completes the build and deploy
  steps

#### Scenario: Workflow fails on test failure
- **WHEN** any test in `pnpm test` fails
- **THEN** the workflow fails and does not deploy

### Requirement: gh-pages branch is the deploy target

The system SHALL publish the built static assets to the root of a
`gh-pages` branch. The system SHALL NOT commit build artifacts to
`main`.

#### Scenario: gh-pages branch contains only built assets
- **WHEN** the deploy step completes
- **THEN** the `gh-pages` branch contains only the contents of
  `apps/web/build/` at its root

### Requirement: HTTPS is enforced

The system SHALL rely on GitHub Pages' built-in HTTPS enforcement.
The workflow SHALL NOT disable or bypass HTTPS.

#### Scenario: Site is served over HTTPS
- **WHEN** a user visits the deployed site
- **THEN** the URL uses `https://` and the browser reports a secure
  connection

### Requirement: Custom domain is optional

The system SHALL support an optional custom domain by adding a
`CNAME` file to the `gh-pages` branch root. The system SHALL NOT
require a custom domain for the default deployment.

#### Scenario: Default deployment uses github.io domain
- **WHEN** no `CNAME` file is present
- **THEN** the site is served from
  `https://heretek-ai.github.io/BlueTeam-EMU/`
