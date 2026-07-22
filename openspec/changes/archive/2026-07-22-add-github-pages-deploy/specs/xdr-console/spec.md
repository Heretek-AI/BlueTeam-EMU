## MODIFIED Requirements

### Requirement: Process tree is renderable per host

The system SHALL provide a process tree view for a given host built
from the events loaded for the current operation. The tree SHALL show
parent-child relationships between processes using parent PID
references and SHALL be renderable in a collapsible hierarchy. Each
process node SHALL display the process name, PID, parent PID, start
timestamp, and integrity label where present.

Process-tree data SHALL be fetched client-side via
`getEntityTimeline(operationId, host, kinds)` in
`apps/web/src/lib/client/xdr.ts`. There SHALL be no
`/api/console/xdr/timeline` endpoint.

#### Scenario: Collapsed tree shows root processes
- **WHEN** the analyst opens the XDR console for a host
- **THEN** the process tree renders with at least one root process
  expanded and all other nodes collapsed

#### Scenario: Expanding a node reveals children
- **WHEN** the analyst clicks the expand control on a process node
- **THEN** the node's direct children are rendered indented beneath it

### Requirement: Suspicious processes are visually flagged

The system SHALL visually flag any process whose `suspicious` flag is
`true` in the loaded events and SHALL show the flag in the process
tree, the process detail panel, and the entity timeline. The flag SHALL
include the rule that triggered the suspicion where available.

#### Scenario: Suspicious process is flagged in the tree
- **WHEN** a process is loaded with `suspicious: true`
- **THEN** the process node renders with a visible suspicious indicator
  and a tooltip naming the rule

### Requirement: Entity timeline shows events for a host over time

The system SHALL provide an entity timeline for a host that lists
process, file, network, and authentication events in chronological
order. The timeline SHALL support filtering by event type and SHALL
display up to `500` events with a "load more" affordance beyond the
initial window.

#### Scenario: Timeline lists events for the active host
- **WHEN** the analyst opens the entity timeline for a host
- **THEN** the timeline shows events from all event types for that
  host ordered by timestamp ascending

#### Scenario: Filtering by event type narrows the list
- **WHEN** the analyst selects the `process` event-type filter
- **THEN** the timeline shows only process events for that host and
  counts the filtered total

### Requirement: XDR entity link-outs share with SIEM and Firewall

The system SHALL provide clickable entity references in the XDR
console that route to the matching view in SIEM and Firewall for the
same entity. A host SHALL link back to a SIEM search filtered by that
host; an IP SHALL link to a Firewall filter for that IP; a file hash
SHALL link to a SIEM search filtered by that hash.

#### Scenario: Clicking a host link opens SIEM search
- **WHEN** the analyst clicks a host entity reference inside XDR
- **THEN** the system navigates to the SIEM console with a saved
  search pre-applied filtering on that host

#### Scenario: Clicking an IP link opens Firewall filter
- **WHEN** the analyst clicks an IP entity reference inside XDR
- **THEN** the system navigates to the Firewall console with the IP
  pre-applied as a filter
