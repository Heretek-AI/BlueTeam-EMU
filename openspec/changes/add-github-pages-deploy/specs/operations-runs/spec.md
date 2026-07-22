## MODIFIED Requirements

### Requirement: Operations can be started, paused, and resumed

The system SHALL create a new run record when an analyst starts an
operation against any loaded operation. The system SHALL mark the run
as `paused` when paused and SHALL restore the run to the last
in-progress step when resumed. Run state SHALL persist across page
reloads and SHALL be stored in the `runs` table of the sql.js
database persisted to IndexedDB.

Run lifecycle operations SHALL be exposed as client-side functions in
`apps/web/src/lib/client/runs.ts` — `startRun(operationId)`,
`pauseRun(runId)`, `resumeRun(runId)`, `submitStep(runId, ...)`,
`completeRun(runId, finalMitre)` — not as HTTP endpoints.

#### Scenario: Starting an operation creates a run
- **WHEN** the analyst starts the *Phishing → Credential Theft*
  operation
- **THEN** the system creates a run record with status `active`,
  bound to the local user and the operation id, and persists it to
  IndexedDB before returning

#### Scenario: Pausing then resuming restores the same step
- **WHEN** the analyst pauses a run on step `3` and resumes it
  later
- **THEN** the run is restored with the current step set back to `3`
  and prior step submissions intact

#### Scenario: Run state persists across reload
- **WHEN** the page is reloaded while a run is active
- **THEN** the run appears in the runs list with status `active` and
  its current step preserved

### Requirement: Step gating enforces prerequisites

The system SHALL prevent the analyst from opening step `N+1` until
step `N` has a recorded verdict submission. The system SHALL also
prevent starting an operation whose prerequisites (declared in
`operation.json`) include another operation that the analyst has not
yet passed.

#### Scenario: Skipping ahead is blocked
- **WHEN** the analyst attempts to open step `3` without a recorded
  verdict on step `2`
- **THEN** the system returns a gating error naming the missing
  prerequisite step

#### Scenario: Unmet operation prerequisite blocks start
- **WHEN** the analyst tries to start an operation whose
  prerequisites include an operation the analyst has not passed
- **THEN** the system returns a gating error naming the unpassed
  prerequisite operation

### Requirement: Hints reveal on a per-step timer with a configurable penalty

The system SHALL display a timer for each step and SHALL reveal the
first hint when the timer reaches the step's `hints_after_seconds`
value. Each subsequent hint SHALL appear after the step's
`hints_interval_seconds` value. The system SHALL record every hint
reveal against the run and SHALL reduce the methodology axis score by
the per-step `hint_penalty_percent` value (an integer in `0..100`),
applied as a percentage reduction.

#### Scenario: First hint appears after the configured delay
- **WHEN** the step declares `hints_after_seconds: 60`
- **THEN** the first hint becomes visible after 60 seconds on the
  active step

#### Scenario: Each hint reveal applies the configured penalty
- **WHEN** a step declares `hint_penalty_percent: 10` and the
  analyst reveals two hints
- **THEN** the methodology axis is reduced by `20%` (capped at a
  minimum score of `0`)

### Requirement: MITRE capture required at operation completion

The system SHALL accept MITRE tag additions and edits on any step
throughout the run, but SHALL require a non-empty
operation-level MITRE tag set before the run can transition to
`completed`. The system SHALL reject completion requests with a
validation error when the operation-level set is empty.

#### Scenario: Empty MITRE set blocks completion
- **WHEN** the analyst submits a completion request with an empty
  operation-level MITRE tag set
- **THEN** the system returns a validation error and SHALL leave the
  run in its prior state

#### Scenario: Non-empty MITRE set allows completion
- **WHEN** the analyst submits a completion request with a
  non-empty operation-level MITRE tag set
- **THEN** the run transitions to `completed` and the operation-level
  tags are stored against the run

### Requirement: Pause and completion are durable

The system SHALL persist the run's status, current step, ordered step
submissions, hint reveals, and completion state to the sql.js
database after each mutation, and SHALL serialize the database to
IndexedDB before the mutation's promise resolves. The system SHALL
reload the run from the database on every read so the client's view
is always consistent with stored state.

#### Scenario: Submission persists immediately
- **WHEN** the analyst submits a verdict for a step
- **THEN** reading the run on a subsequent call SHALL return the
  submission without waiting for batched writes

#### Scenario: Completion is final
- **WHEN** a run has transitioned to `completed`
- **THEN** further submission requests for the run SHALL return an
  error and SHALL NOT mutate the stored record
