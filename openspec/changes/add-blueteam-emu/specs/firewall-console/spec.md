## ADDED Requirements

### Requirement: Connection table is filterable

The system SHALL provide a Firewall connection table populated from the
current operation's events. The table SHALL support combined filters
on source IP, destination IP, destination port, destination ASN, and a
time window. The table SHALL return rows ordered by timestamp
ascending and SHALL respect the same `limit` ceiling of `1000` as the
SIEM console.

#### Scenario: Filter by destination port narrows results
- **WHEN** the analyst applies `dport: 443` to the Firewall table
- **THEN** only connections whose destination port is `443` are
  returned

#### Scenario: Combined filters AND together
- **WHEN** the analyst applies `dst_ip: "185.220.101.47"` together
  with `time_window: { from: "...", to: "..."}`
- **THEN** only connections matching both filters are returned

### Requirement: ASN column is rendered when present

The system SHALL display the destination ASN for every connection that
includes an ASN field and SHALL fall back to a dash when the ASN is
absent. The ASN column SHALL be sortable alongside the standard
columns.

#### Scenario: Connections without ASN render a dash
- **WHEN** a connection event has no `asn` field
- **THEN** the ASN column SHALL render a dash for that row and sort
  comparisons SHALL treat dashed rows as equal

### Requirement: Entity link-outs are available in the table

The system SHALL provide clickable entity references for source IP,
destination IP, and destination host inside the Firewall console.
Clicking a source IP SHALL pre-apply that value as the source filter;
clicking a destination IP SHALL pre-apply it as the destination filter;
clicking a destination host SHALL navigate to the SIEM console filtered
by that host.

#### Scenario: Clicking a source IP filters the table
- **WHEN** the analyst clicks a source IP entity reference in the
  Firewall console
- **THEN** the connection table is re-filtered to show only rows whose
  source IP matches

#### Scenario: Clicking a destination host opens SIEM
- **WHEN** the analyst clicks a destination host entity reference
- **THEN** the system navigates to the SIEM console filtered on that
  host
