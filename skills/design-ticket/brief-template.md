# Design brief template

Written to `<handover-dir>/<TICKET>/design-brief.md`. Nine H2s, kept exactly: the
pipeline planner and the reviewer grep for them. The brief doubles as a paste-ready prompt
for a design tool.

```markdown
# Design brief: PROJ-123 - <summary>
Ticket · Epic · PRD / UX page · Earlier design · Date

## Problem and users
<!-- The job, the persona, the constraint. Stated without naming a solution. -->

## Current behaviour (from code)
<!-- Component files, shared components used, states already handled, fetch cadence,
default sort, what the API can and cannot do. Read from the code, not the ticket. -->

## State matrix
| element | lifecycle x level | treatment | message |
| --- | --- | --- | --- |

## Flows
<!-- Numbered per job: entry points, happy path, every exit, where the user lands. -->

## Layout and components
| region | shared component | actions | notes |
| --- | --- | --- | --- |

## Copy
| key | string | pattern (empty / error / confirm / pending / success) |
| --- | --- | --- |

## Data needs
| screen or artboard | fields needed | source API | known gap |
| --- | --- | --- | --- |

## Open questions for Product
<!-- Every state or string that cannot be traced to the ticket, epic or code. -->

## Artboards
| artboard | states covered | ticket(s) it covers |
| --- | --- | --- |
```

The data-needs table is the input the next API spike asks for; the artboards table is what
`--stories` and the planner's design mapping consume.
