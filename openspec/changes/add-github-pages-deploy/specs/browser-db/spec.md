## ADDED Requirements

### Requirement: sql.js is used for all client-side persistence

The system SHALL use `sql.js` (WebAssembly SQLite) for all client-side
data persistence. The system SHALL NOT use `localStorage` or
`sessionStorage` for structured data (runs, submissions, saved
searches, entities, events, firewall events, tracks, operations,
enrollments, track completions, MITRE techniques). The system SHALL
persist the entire SQLite database to IndexedDB after every write.

#### Scenario: Database is initialized on first load
- **WHEN** the app loads in a browser with no existing IndexedDB
  record
- **THEN** sql.js initializes a new database with the full schema and
  the app proceeds without error

#### Scenario: Write persists to IndexedDB
- **WHEN** the app performs any write (insert, update, delete)
- **THEN** the database is serialized and written to IndexedDB before
  the promise resolves

#### Scenario: Reload restores state
- **WHEN** the user refreshes the page after performing writes
- **THEN** the app loads the serialized database from IndexedDB and
  all prior state is visible

### Requirement: Schema parity with the Drizzle schema is maintained

The system SHALL create tables whose names and columns match the
Drizzle schema in `apps/web/src/lib/server/db/schema.ts`. The system
SHALL preserve primary keys, foreign key relationships, and default
values. The system SHALL NOT create additional tables beyond those
defined in the schema.

#### Scenario: All tables exist after init
- **WHEN** the database is initialized
- **THEN** the following tables exist: `users`, `operations`,
  `tracks`, `track_operations`, `enrollments`, `track_completions`,
  `runs`, `step_submissions`, `saved_searches`, `entities`, `events`,
  `event_entities`, `firewall_events`, `mitre_techniques`

#### Scenario: Foreign keys are enforced
- **WHEN** a row is inserted with a foreign key reference to a
  non-existent parent
- **THEN** the insert fails with a foreign key violation

### Requirement: Migration path exists for existing local users

The system SHALL detect an existing IndexedDB record with a prior
schema version and apply migrations to reach the current version.
Migrations SHALL be idempotent and SHALL NOT destroy existing data.

#### Scenario: Existing user data survives migration
- **WHEN** an IndexedDB record from an earlier version is detected
- **THEN** the system migrates the schema and preserves all rows in
  `users`, `runs`, `step_submissions`, and `track_completions`

### Requirement: Clear-all-data affordance is available

The system SHALL provide a button on `/profile` that deletes the
IndexedDB database and reloads the page, returning the user to a
fresh state.

#### Scenario: Clear-all-data resets the app
- **WHEN** the user clicks "Clear all data" on `/profile`
- **THEN** the IndexedDB database is deleted, the page reloads, and
  the app initializes a fresh database

### Requirement: Optional GitHub PAT is stored in localStorage only

The system SHALL store an optional GitHub personal access token in
`localStorage` under the key `blueteam-emu:github-pat`. The system
SHALL use this token only for `raw.githubusercontent.com` fetches
when syncing scenarios from a private repo. The system SHALL NEVER
send the token to any other origin.

#### Scenario: PAT is stored locally
- **WHEN** the user pastes a PAT on `/profile` and clicks "Save"
- **THEN** the token is stored in `localStorage` under the specified
  key and is not transmitted to any server

#### Scenario: PAT is used only for raw.githubusercontent.com
- **WHEN** the app fetches scenario content from a private repo
- **THEN** the `Authorization` header is included only for requests
  to `raw.githubusercontent.com`
