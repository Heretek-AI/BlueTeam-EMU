## ADDED Requirements

### Requirement: Radar aggregates eight competency axes

The system SHALL compute per-run, per-operation, per-track, and
per-user aggregates across exactly eight axes: `speed`,
`accuracy`, `correlation`, `methodology`, `detectionCoverage`,
`documentation`, `timeToFirstAction`, and `pressure`. Each axis
SHALL be normalized to the range `0..100`. The system SHALL expose
the axis formulas in `packages/grading/axes.ts` so authors and
analysts can read them.

#### Scenario: A run returns eight axis scores
- **WHEN** `scoreRun(runId)` is called for a completed run
- **THEN** the returned object SHALL include keys for all eight axes,
  each with a numeric value in `0..100`

#### Scenario: Axis formulas are inspectable
- **WHEN** `packages/grading/axes.ts` is read
- **THEN** every axis name MUST appear with its formula and a short
  plain-language description

### Requirement: Aggregations roll up across scopes deterministically

The system SHALL define explicit roll-up rules for operation
aggregation (mean of run axis scores weighted by completion), track
aggregation (mean of operation aggregates), and user aggregation
(mean of track aggregates). The system SHALL persist each aggregate
against its scope and SHALL recompute the aggregate whenever an
underlying run's submissions change.

#### Scenario: Track aggregation reflects latest run
- **WHEN** the analyst updates a step submission on a passed run
  inside a track
- **THEN** the track aggregate is recomputed and the report page
  reflects the new value on next read

#### Scenario: Re-scoring is idempotent
- **WHEN** `aggregateRadar(userId, scope)` is called twice with no
  intervening changes
- **THEN** both calls SHALL return byte-identical aggregates

### Requirement: Competency radar is rendered as an SVG

The system SHALL render the eight-axis aggregate as a radar chart in
SVG on the report page for any of the scopes: per operation, per
track, or per user. The chart SHALL label every axis, show the
current score on hover, and apply consistent visual encoding across
all scopes.

#### Scenario: Report page renders the radar
- **WHEN** the analyst opens the report page for the local user
- **THEN** the page renders the per-user radar with all eight axes
  labeled

#### Scenario: Hover reveals the axis score
- **WHEN** the analyst hovers over an axis on the radar
- **THEN** a tooltip SHALL appear with the axis name, current score,
  and a short description from `packages/grading/axes.ts`

### Requirement: Radar scores are never negative

The system SHALL clamp every axis score to a minimum of `0` and a
maximum of `100`. The system SHALL apply the per-step
`hint_penalty_percent` reductions after computing the axis so that
penalties cannot produce a sub-zero value.

#### Scenario: Excessive penalty clamps to zero
- **WHEN** a step's hint penalties would otherwise drive the
  methodology axis below `0`
- **THEN** the methodology axis SHALL be reported as `0`

#### Scenario: Normalization upper bound holds
- **WHEN** raw axis computation exceeds `100`
- **THEN** the system SHALL clamp the reported score to `100`
