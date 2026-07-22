## MODIFIED Requirements

### Requirement: Exactly one local user exists

The system SHALL ensure that exactly one local user record exists at
any time, stored in the `users` table of the sql.js database persisted
to IndexedDB. On first run, the system SHALL create this record with a
display name taken from `localStorage.getItem('blueteam-emu:display-name')`,
or `BLUETEAM_EMU_USER` in dev mode, defaulting to `"analyst"`. The
system SHALL refuse to create a second local user and SHALL refuse to
delete the local user from any client route.

#### Scenario: First run creates the local user
- **WHEN** the application loads in a browser against an empty
  IndexedDB database
- **THEN** the system creates a local user with the
  `blueteam-emu:display-name` localStorage value (or the dev
  `BLUETEAM_EMU_USER` env value, or `"analyst"` if neither is set)

#### Scenario: Restart does not create a duplicate
- **WHEN** the application loads in a browser whose IndexedDB
  database already contains a local user
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
name to IndexedDB, SHALL surface it across the UI, and SHALL keep
the change across page reloads.

#### Scenario: Updating display name persists
- **WHEN** the analyst submits a new display name from the profile
  page
- **THEN** the local user record in IndexedDB is updated and the new
  name is rendered in the top bar and profile page

#### Scenario: Display name survives reload
- **WHEN** the page is reloaded after a display name change
- **THEN** the new display name is rendered on the top bar and
  profile page

## REMOVED Requirements

### Requirement: Dev-only reset script exists
**Reason**: Replaced by an in-app "Clear all data" button on
`/profile` that deletes the IndexedDB database and reloads the page.
The standalone `pnpm reset-user` script is no longer meaningful in a
client-only static build.

**Migration**: Use the "Clear all data" button on `/profile`. In dev
mode, the same effect is available by deleting the IndexedDB record
from DevTools and reloading.
