## ADDED Requirements

### Requirement: Verdict submission is per-step and persisted

The system SHALL accept a verdict for a run step with the value `tp`,
`fp`, or `benign`, an optional free-text note, and an optional ordered
list of MITRE technique ids. The system SHALL persist the submission as
part of the run record and SHALL make it immutable once the run is
marked submitted for the step.

#### Scenario: Submitting a valid verdict persists it
- **WHEN** the analyst submits `{verdict: "tp", note: "...",
  mitre_tags: ["T1078"]}` for a step
- **THEN** the system stores the submission, attaches it to the run,
  and returns the saved record

#### Scenario: Invalid verdict is rejected
- **WHEN** the analyst submits a verdict value that is not `tp`, `fp`,
  or `benign`
- **THEN** the system returns a validation error and SHALL NOT mutate
  the run record

### Requirement: MITRE tag grading matches the ground truth

The system SHALL grade MITRE tags by computing the Jaccard similarity
between the submitted technique id set and the step's
`expected_mitre` set. The system SHALL score `1.0` for an exact set
match, partial credit proportional to the intersection for overlap, and
`0.0` for any disjoint submission.

#### Scenario: Exact match scores full marks
- **WHEN** the submitted MITRE tag set equals the step's expected set
- **THEN** the MITRE score SHALL be `1.0`

#### Scenario: Partial overlap scores proportional to overlap
- **WHEN** the submitted set is a strict subset or superset of the
  expected set with at least one common id
- **THEN** the MITRE score SHALL be `|intersection| / |union|`

#### Scenario: Empty expected set treats submission as neutral
- **WHEN** a step declares no expected MITRE techniques and the
  analyst submits tags
- **THEN** the step SHALL be graded only on verdict, and the MITRE
  score contributes `0` to the per-axis aggregation

### Requirement: MITRE capture is required at operation end

The system SHALL allow MITRE tags to be optionally added or edited on
each step, but SHALL require that the analyst submit a final
operation-level MITRE tag set before the run can be marked complete.
The system SHALL reject completion with a validation error if the
final operation-level tag set is empty.

#### Scenario: Empty final MITRE set blocks completion
- **WHEN** the analyst attempts to complete an operation with an empty
  operation-level MITRE tag set
- **THEN** the system returns a validation error stating that MITRE
  tagging is required before completion

#### Scenario: Non-empty final MITRE set allows completion
- **WHEN** the analyst submits a non-empty operation-level MITRE tag
  set
- **THEN** the system finalizes the run and records the submitted tags
  as the operation-level answer

### Requirement: Verdict grading is exact-match against ground truth

The system SHALL grade each step's verdict by comparing it to the
step's expected verdict in the ground truth. A step SHALL score `1.0`
on the verdict axis for an exact match and `0.0` otherwise. Steps with
no expected verdict SHALL contribute `0` to the per-axis aggregation.

#### Scenario: Verdict matches expected
- **WHEN** the submitted verdict equals the expected verdict for the
  step
- **THEN** the verdict contribution to the run's accuracy axis SHALL be
  `1.0`

#### Scenario: Verdict differs from expected
- **WHEN** the submitted verdict differs from the expected verdict
- **THEN** the verdict contribution SHALL be `0.0`

### Requirement: Note grading rewards correct key indicators

The system SHALL grade the optional note by tokenizing both the
submitted note and the step's `expected_indicators` list and
computing the recall ratio of expected indicators present in the note.
The note SHALL contribute to the documentation axis with weight `0`
when no expected indicators are defined for the step.

#### Scenario: All expected indicators are mentioned
- **WHEN** every expected indicator appears as a substring of the
  submitted note
- **THEN** the note score SHALL be `1.0`

#### Scenario: Some expected indicators are missing
- **WHEN** a strict subset of expected indicators appears in the note
- **THEN** the note score SHALL be the ratio of present indicators to
  the total expected

### Requirement: Run record is deterministic and replayable

The system SHALL persist the full run record — ordered submissions,
hint reveals, console events, and timestamps — such that calling
`scoreRun(runId)` twice with no intervening changes returns identical
per-axis sub-scores and identical per-axis aggregates. The system
SHALL expose `scoreRun` as a pure function in `packages/grading`.

#### Scenario: Re-scoring a stable run is idempotent
- **WHEN** `scoreRun` is called twice with no changes to the run record
  between calls
- **THEN** both calls SHALL return byte-identical score objects

#### Scenario: Re-scoring after a correction reflects the change
- **WHEN** the analyst updates a step submission and `scoreRun` is
  called again
- **THEN** the returned scores SHALL differ in exactly the axes
  affected by the changed step
