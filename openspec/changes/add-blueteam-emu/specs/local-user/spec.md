## ADDED Requirements

### Requirement: Exactly one local user exists

The system SHALL ensure that exactly one local user record exists at
any time. On first run, the system SHALL create this record with a
display name taken from the `BLUETEAM_EMU_USER` environment variable,
defaulting to `"analyst"`. The system SHALL refuse to create a
second local user and SHALL refuse to delete the local user from any
HTTP route.

#### Scenario: First run creates the local user
- **WHEN** the application starts against an empty database
- **THEN** the system creates a local user with the
  `BLUETEAM_EMU_USER` env value, or `"analyst"` if unset

#### Scenario: Restart does not create a duplicate
- **WHEN** the application starts against a database that already
  contains a local user
- **THEN** the existing record is preserved and no second record is
  created

### Requirement: There is no signup or login surface

The system SHALL NOT expose any signup, login, logout, password
reset, or OAuth route. All progress and aggregate data SHALL be
attributed to the single local user automatically without any
analyst action.

#### Scenario: Signup route does not exist
- **WHEN** a request is sent to `/signup`, `/login`, or `/logout`
- **THEN** the system returns HTTP 404 and SHALL NOT mutate any
  state

#### Scenario: All progress is attributed to the local user
- **WHEN** the analyst performs any operation
- **THEN** the resulting run, enrollment, or aggregate data SHALL be
  attributed to the single local user record

### Requirement: Display name is editable and persists

The system SHALL allow the local user to change their display name
from the profile page. The system SHALL persist the new display
name, SHALL surface it across the UI, and SHALL keep the change
across application restarts.

#### Scenario: Updating display name persists
- **WHEN** the analyst submits a new display name from the profile
  page
- **THEN** the local user record is updated and the new name is
  rendered in the top bar and profile page

#### Scenario: Display name survives restart
- **WHEN** the application is restarted after a display name change
- **THEN** the new display name is rendered on the top bar and
  profile page

### Requirement: Dev-only reset script exists

The system SHALL provide a `pnpm reset-user` script that resets the
local user's display name and clearable run history. The script
SHALL NOT be reachable from any HTTP route.

#### Scenario: Reset script clears run history
- **WHEN** a developer runs `pnpm reset-user`
- **THEN** the local user's display name is restored to the
  `BLUETEAM_EMU_USER` env value (or `"analyst"`) and all runs and
  enrollments are removed
