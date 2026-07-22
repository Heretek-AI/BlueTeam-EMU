## MODIFIED Requirements

### Requirement: Tracks list ordered operations with gating

The system SHALL load tracks from the bundled static asset
`/BlueTeam-EMU/content/tracks.json`, each track declaring an ordered
list of operation ids and a `gating.threshold` integer in `0..100`.
The system SHALL display tracks in the UI with their declared
ordering and SHALL allow the analyst to enroll in any loaded track.

Track data SHALL be fetched client-side via `listTracks()` in
`apps/web/src/lib/client/tracks.ts`. There SHALL be no server-side
track loader.

#### Scenario: Tracks render in declared order
- **WHEN** the analyst opens the Tracks page
- **THEN** every loaded track is listed with its title, ordered
  operation list, and gating threshold

#### Scenario: Enrolling binds the local user to the track
- **WHEN** the analyst clicks *Enroll* on a track
- **THEN** the system records an enrollment row for the local user
  and the track in the sql.js database

### Requirement: Track progression gates operations on passing scores

The system SHALL treat an operation as "passed" against a track when
the local user's run on that operation meets or exceeds the track's
gating threshold. The system SHALL block progression to the next
operation in the track until the prior operation is passed.

Pass/fail state SHALL be computed client-side from the sql.js
database by `getTrackProgress(trackId)` in
`apps/web/src/lib/client/tracks.ts`.

#### Scenario: Passing the prior operation unlocks the next
- **WHEN** the analyst's run on operation `N` scores at or above the
  track threshold
- **THEN** operation `N+1` becomes startable for that track

#### Scenario: Failing the prior operation keeps the next locked
- **WHEN** the analyst's run on operation `N` scores below the
  track threshold
- **THEN** operation `N+1` SHALL NOT be startable and the UI SHALL
  show a lock state with the current best score

### Requirement: Track completion is recorded as a badge

The system SHALL mark a track as completed for the local user when
every operation in the track's ordered list has been passed. The
system SHALL persist the completion timestamp in the sql.js database
and SHALL expose a "completion badge" on the dashboard and tracks
list pages.

#### Scenario: Completing the final operation marks the track
- **WHEN** the analyst passes the final operation in a track
- **THEN** the system persists a completion record for the track and
  the local user and a badge becomes visible

#### Scenario: Replaying operations does not erase completion
- **WHEN** a track is already completed and the analyst replays any
  operation
- **THEN** the completion record remains and the badge remains
  visible

### Requirement: Completion is durable and visible across restarts

The system SHALL persist track enrollments and completions against
the local user record in the sql.js database and SHALL reload them
on every read so the dashboard renders correctly across page reloads.

#### Scenario: Restart preserves enrollments and badges
- **WHEN** the page is reloaded
- **THEN** enrollments and completion badges are still visible to the
  same local user on the dashboard
