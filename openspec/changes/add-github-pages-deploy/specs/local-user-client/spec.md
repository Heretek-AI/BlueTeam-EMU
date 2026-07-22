## ADDED Requirements

### Requirement: Single local user lives in IndexedDB

The system SHALL store the local user record in IndexedDB under the
`users` table of the sql.js database. The system SHALL ensure exactly
one row exists at any time. The system SHALL create the row on first
load with a display name from `BLUETEAM_EMU_USER` (dev) or
`localStorage.getItem('blueteam-emu:display-name')` (prod), defaulting
to `"analyst"`.

#### Scenario: First load creates the user
- **WHEN** the app loads in a browser with no existing IndexedDB
  record
- **THEN** the system creates a user row with the appropriate display
  name and persists it to IndexedDB

#### Scenario: No duplicate users
- **WHEN** the app loads with an existing IndexedDB record
- **THEN** the existing user row is preserved and no second row is
  created

### Requirement: Display name is editable and persists

The system SHALL allow the user to change their display name from
`/profile`. The system SHALL persist the new name to IndexedDB and
SHALL surface it across the UI.

#### Scenario: Display name persists across reload
- **WHEN** the user changes their display name and reloads the page
- **THEN** the new name is rendered in the top bar and profile page

### Requirement: No signup or login surface

The system SHALL NOT expose any signup, login, logout, password
reset, or OAuth route. All progress SHALL be attributed to the
single local user automatically.

#### Scenario: Auth routes do not exist
- **WHEN** a request is sent to `/signup`, `/login`, or `/logout`
- **THEN** the system returns HTTP 404

### Requirement: Optional GitHub PAT field

The system SHALL provide an optional text field on `/profile` for
pasting a GitHub personal access token. The system SHALL store the
token in `localStorage` under `blueteam-emu:github-pat`. The system
SHALL NOT send the token to any server.

#### Scenario: PAT is stored locally
- **WHEN** the user pastes a PAT and clicks "Save"
- **THEN** the token is stored in `localStorage` and is not
  transmitted to any origin

### Requirement: Clear-all-data resets the user

The system SHALL provide a "Clear all data" button on `/profile`
that deletes the IndexedDB database and reloads the page, creating
a fresh user row on next load.

#### Scenario: Clear-all-data resets the user
- **WHEN** the user clicks "Clear all data"
- **THEN** the IndexedDB database is deleted, the page reloads, and
  a fresh user row is created with the default display name
