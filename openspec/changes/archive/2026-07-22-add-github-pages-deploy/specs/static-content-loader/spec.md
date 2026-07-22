## ADDED Requirements

### Requirement: Content is bundled at build time

The system SHALL copy the validated contents of `content/operations/`
and `content/tracks.json` into `apps/web/static/content/` before the
SvelteKit build step. The system SHALL run `pnpm validate-scenarios`
before the copy and SHALL fail the build if validation fails.

#### Scenario: Build includes validated content
- **WHEN** `pnpm build` runs successfully
- **THEN** `apps/web/build/content/` contains the same directory
  structure and files as `content/`

#### Scenario: Invalid content blocks the build
- **WHEN** `pnpm validate-scenarios` fails
- **THEN** the build fails with a non-zero exit code and no content
  is copied

### Requirement: Browser fetches content from static assets

The system SHALL load operation and track data by fetching JSON from
the static asset paths under `/BlueTeam-EMU/content/`. The system
SHALL NOT attempt to fetch scenario data from any external URL by
default.

#### Scenario: Operation data loads from static assets
- **WHEN** the app loads an operation detail page
- **THEN** the operation metadata, steps, alerts, logs, and ground
  truth are fetched from `/BlueTeam-EMU/content/operations/<id>/`
  with no external network requests

#### Scenario: Track data loads from static assets
- **WHEN** the app loads a track page
- **THEN** the track metadata and ordered operation list are fetched
  from `/BlueTeam-EMU/content/tracks.json`

### Requirement: Optional private-repo sync uses PAT

The system SHALL provide an optional "Sync from private repo" button
on `/profile` that fetches scenario content from a GitHub repo using
the stored PAT. The system SHALL validate the fetched content against
the Zod schemas before accepting it. The system SHALL fall back to
bundled content if the fetch fails or validation fails.

#### Scenario: Private repo sync succeeds
- **WHEN** the user provides a valid PAT and a valid repo URL
- **THEN** the app fetches the scenario files, validates them, and
  updates the local database with the new content

#### Scenario: Private repo sync fails gracefully
- **WHEN** the fetch fails or the content fails validation
- **THEN** the app shows an error message and continues using the
  bundled content

### Requirement: No runtime validation of bundled content

The system SHALL NOT run Zod validation on bundled content at runtime.
The system SHALL assume that bundled content is pre-validated by the
build-time `pnpm validate-scenarios` step.

#### Scenario: Bundled content loads without validation delay
- **WHEN** the app loads bundled scenario content
- **THEN** no Zod validation is performed and the content is
  available immediately
