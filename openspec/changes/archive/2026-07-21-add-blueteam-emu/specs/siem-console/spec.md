## ADDED Requirements

### Requirement: Faceted log search returns matching events

The system SHALL provide a search endpoint that returns log events
matching a structured query composed of field-value filters joined by
AND. Each filter SHALL match events whose `fields.<name>` equals the
provided value exactly (case-insensitive for string fields). Results
SHALL be ordered by timestamp ascending and SHALL support a `limit`
parameter defaulting to `200` with a hard ceiling of `1000`.

#### Scenario: Matching query returns events
- **WHEN** the analyst submits `{ "filters": [{"field":"host",
  "value":"WS01"}], "limit": 50 }`
- **THEN** the endpoint returns up to 50 events for host `WS01`
  ordered by timestamp ascending

#### Scenario: Limit above hard ceiling is clamped
- **WHEN** the analyst submits `limit: 5000`
- **THEN** the endpoint clamps the limit to `1000` and returns at most
  `1000` events

#### Scenario: Non-matching query returns empty list
- **WHEN** the analyst submits a query that matches no events
- **THEN** the endpoint returns `{ events: [], total: 0 }` with HTTP
  200

### Requirement: Saved searches are scoped to the local user

The system SHALL persist saved searches against the single local user
record. Each saved search SHALL store a name, the structured query,
and the timestamp of the most recent run. The system SHALL return only
searches belonging to the local user and SHALL enforce a maximum of
`50` saved searches per user.

#### Scenario: Saving a new search persists it
- **WHEN** the analyst saves a search with a name and query
- **THEN** the search is persisted and appears in the analyst's saved
  search list

#### Scenario: Over the cap is rejected
- **WHEN** the analyst tries to save a `51`st search
- **THEN** the system returns a validation error and SHALL NOT persist
  the new search

### Requirement: Event detail drawer shows full record

The system SHALL provide an event detail view that displays every
field of the selected event, including the raw payload, all extracted
fields, the linked entities, and a timeline indicator relative to the
run's progress. The system SHALL be reachable from any log row in the
event table and from any console that displays a log-derived record.

#### Scenario: Clicking a row opens the detail drawer
- **WHEN** the analyst clicks a row in the SIEM event table
- **THEN** the drawer opens with the event's full record and linked
  entities visible

#### Scenario: Detail drawer shows linked entities
- **WHEN** the event is associated with one or more entities
  (ip, host, user, file_hash, domain)
- **THEN** each entity SHALL be shown with a clickable affordance that
  routes to the appropriate console

### Requirement: Entity link-outs jump to the matching console

The system SHALL provide clickable entity references inside the SIEM
console that route to the relevant view in XDR or Firewall for the
same entity. An IP SHALL link to the Firewall filter for that IP; a
host SHALL link to the XDR entity timeline for that host; a username
SHALL link to a SIEM search filtered by that user.

#### Scenario: Clicking an IP opens Firewall filter
- **WHEN** the analyst clicks an IP entity reference in the SIEM
  console
- **THEN** the system navigates to the Firewall console with that IP
  pre-applied as a filter

#### Scenario: Clicking a host opens XDR timeline
- **WHEN** the analyst clicks a host entity reference in the SIEM
  console
- **THEN** the system navigates to the XDR console with that host as
  the active timeline subject
