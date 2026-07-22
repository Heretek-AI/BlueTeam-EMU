## MODIFIED Requirements

### Requirement: Operation is a folder of validated JSON files

The system SHALL represent each operation as a directory on disk
containing a fixed set of JSON files (`operation.json`, `steps/*.json`,
`data/alerts.jsonl`, `data/logs.jsonl`, `data/ground_truth.json`) and
SHALL refuse to load any directory that is missing a required file or
whose contents fail Zod validation.

At build time, the system SHALL copy the validated contents of
`content/operations/` into `apps/web/static/content/operations/` and
`content/tracks.json` into `apps/web/static/content/tracks.json`.
The browser SHALL load these pre-validated JSON files directly from
static asset paths without running Zod validation.

#### Scenario: Loading a complete operation succeeds
- **WHEN** a directory contains all required files and every file
  parses against its schema
- **THEN** the loader returns a fully populated operation object and
  the operation becomes selectable in the UI

#### Scenario: Missing required file is rejected
- **WHEN** a directory is missing `operation.json` or any required
  step file
- **THEN** the loader returns a structured error naming the missing
  file and SHALL NOT partially load the operation

#### Scenario: Bundled content loads without validation delay
- **WHEN** the app loads bundled scenario content from
  `/BlueTeam-EMU/content/operations/<id>/`
- **THEN** no Zod validation is performed and the content is
  available immediately

### Requirement: Ground-truth references resolve

The system SHALL resolve every alert id, log id, step id, and entity id
referenced inside `ground_truth.json` against the alerts, logs, steps,
and entity tables for the same operation. The system SHALL refuse to
load an operation whose ground truth contains an unresolvable reference
and SHALL list the dangling ids in the error.

#### Scenario: Valid ground truth passes validation
- **WHEN** every id in `ground_truth.json` matches an id present in the
  rest of the operation's files
- **THEN** the operation loads successfully

#### Scenario: Dangling reference is rejected with details
- **WHEN** a ground-truth entry references an alert id that does not
  exist
- **THEN** validation fails and the error message MUST include the
  missing id and the step it belongs to

### Requirement: MITRE technique ids are valid

The system SHALL validate every MITRE ATT&CK technique id declared on
an operation, step, or ground-truth entry against the bundled MITRE
reference table. The system SHALL reject operations whose technique ids
are unknown.

#### Scenario: Valid technique id is accepted
- **WHEN** an operation declares `mitre_techniques: ["T1078"]`
- **THEN** validation passes and the id is recorded against the
  operation

#### Scenario: Unknown technique id is rejected
- **WHEN** an operation declares a technique id that is not in the
  reference table
- **THEN** validation fails with an error naming the unknown id

### Requirement: Tracks reference real operations and ordered gating

The system SHALL represent each track as a JSON object whose operation
ids resolve to existing operations and whose `gating` thresholds are
non-negative integers in the range `0..100`. The system SHALL refuse to
load tracks that reference unknown operations or use out-of-range
thresholds.

#### Scenario: Track with valid operation ids loads
- **WHEN** a track's `operation_ids` all match loaded operations and
  thresholds are within `0..100`
- **THEN** the track loads and is selectable in the UI

#### Scenario: Track referencing unknown operation is rejected
- **WHEN** a track lists an operation id that does not correspond to
  any loaded operation
- **THEN** validation fails and the error MUST name the missing
  operation id

### Requirement: Validator is exposed as a CLI command

The system SHALL expose a `pnpm validate-scenarios` command that walks
`content/operations/` and `content/tracks/`, validates every directory
and file against the Zod schemas, and prints a per-file pass / fail
report. The command SHALL exit non-zero when any scenario fails
validation.

The build step SHALL run `pnpm validate-scenarios` before copying
content to `static/`. The browser SHALL NOT run the validator at
runtime.

#### Scenario: All scenarios valid
- **WHEN** every operation and track in `content/` is valid
- **THEN** the command prints one passing line per file and exits with
  code `0`

#### Scenario: One scenario invalid
- **WHEN** at least one scenario fails Zod validation
- **THEN** the command prints the failure with the file path and
  reason, and exits non-zero

#### Scenario: Build fails on invalid content
- **WHEN** `pnpm validate-scenarios` fails during the build step
- **THEN** the build fails with a non-zero exit code and no content
  is copied to `static/`
