---
name: write-ticket
description: >-
  Use when asked to create, write, raise, draft or log a new ticket in the
  ticket tracker: "create a ticket for this bug report", "raise a team ticket
  from this customer issue and link it", "write a story for X", "what labels
  should this have?", "turn this thread into a ticket". Not for improving a
  ticket that already exists, and not for duplicate triage.
---

# Write ticket

## Overview

Write a ticket that a developer or an agent can pick up without asking the
questions again: where the code lives, what done looks like, what must not
change, and where the evidence came from.

## When to use

| Task                                        | Use instead                     |
| ------------------------------------------- | ------------------------------- |
| Improve a ticket that exists                | `assess-ticket`                 |
| "Is this a duplicate?"                      | your tracker's triage flow      |
| A spec that becomes an epic plus many tickets | a spec-to-backlog flow        |
| Start work on a ticket                      | `start-ticket`                  |

## Procedure

### 1. Read the source

The source is a customer or ops ticket, a chat thread, a report, or a
screenshot.

- **Jira:** fetch with issue links, then read the comments. The real question
  is often only in a comment.
- **GitHub:** `gh issue view <n> --comments`.
- Check nothing exists yet. **Jira:** JQL
  `project = PROJ AND issue in linkedIssues(SRC-1)` plus a
  `text ~ "<key phrase>"` search. **GitHub:**
  `gh issue list --search "<key phrase>"`. If one exists, stop and report it.

### 2. Find the code

Name the package and file in the ticket. Grep for it; if ownership is unclear,
use the repo's navigator agent or the area map in `start-ticket`. A pointer
is enough. Leave the implementation plan to the developer.

### 3. Pick the fields

| Field           | Default                                                                                                               | Note                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Type            | Story: user-visible change. Bug: wrong behaviour. Task: tooling or pipeline, nothing user-visible. Spike: unknowns to investigate. Design: a UX deliverable. | Type selects the `ticket-pipeline` profile |
| Priority        | Copy the source; otherwise the team's routine level                                                                   | The highest level is for release-blocking bugs only        |
| Labels          | step 4                                                                                                                |                                                            |
| Parent or epic  | Only when the user names one                                                                                          | Some APIs do not echo `parent`; confirm on read-back       |
| Estimate        | Score with the rubric in step 5                                                                                       | Record the three scores in a comment                       |
| Assignee, sprint | Empty unless asked                                                                                                   |                                                            |

### 4. Labels

Exactly one `area-*` label, then any that apply (example vocabulary; use your own):

| Label                                          | Use when                                        |
| ---------------------------------------------- | ----------------------------------------------- |
| `area-<name>`                                  | Always one: the product area                    |
| `involves-ux`                                  | A design or layout decision is needed           |
| `involves-product`                             | A scope or behaviour decision is needed         |
| `for-qa-testing`                               | A user-visible change QA should test            |
| `quality-performance`, `quality-data-integrity` | The main aim is speed, or not losing data      |
| `found-in-<build>`                             | A bug found while testing a specific build      |
| `e2e`, `release-gate`, `pipeline`              | Test-suite or CI work                           |

Make a new label only when nothing fits, and say so in the reply.

### 5. Estimate: human effort and risk, not code size

Score Clarity, Verification and Risk 1-3 each with
`references/estimation-rubric.md`, add them, convert to points. Estimate
assuming an agent does the typing, and never lower points afterwards because
it was fast. Dev Ready only when Clarity is 1 or 2; Clarity 3 means the first
AC is "agree X with Y" or the ticket is a Spike. Record the breakdown in a
comment: `Estimate: Clarity 2, Verification 2, Risk 2 = 6 -> 3 pts. <why>`.

### 6. Description

Send real Markdown (`contentFormat: markdown` on Jira; `--body-file` on
GitHub).

```markdown
## Context

<What is wrong or missing today, who it affects, why it matters. Name the
source. Screenshots stay on the source ticket - say so; with no source,
attach them here.>

**Before starting:** <open question or dependency and its owner. Delete if none.>

## Where it lives

`apps/billing`:
* `src/lib/invoice-list/invoice-list.component.html` - <what is there> (from about line N)

## Acceptance criteria

* <One testable outcome per bullet; GIVEN/WHEN/THEN when it depends on state>
* <What must stay unchanged>
* <If flagged: behind `<flag-key>`, default off, added to the flag inventory>
* Unit tests cover <x>; the <domain> E2E suite still passes.

## Links

<source ticket>, <dependencies>, <originating report or thread>
```

- QA must be able to mark each AC pass or fail.
- Nobody has said what done looks like? The first AC is "agree <x> with
  <owner> before development", plus `involves-ux` or `involves-product`. Do
  not invent the answer.
- Restate the source for a developer; do not paste it in.

### 7. Create, link, verify

"Draft" means show it and wait. "Create" or "raise" means go.

1. Create. **Jira:** `createJiraIssue` returns only the key. **GitHub:**
   `gh issue create --title ... --body-file ... --label ...`.
2. Link to the source with `Relates`; use `Blocks` when something must land
   first (the blocker is the inward issue). No source? Link the nearest
   related ticket on the same screen.
3. Attach the user's screenshot when no source ticket holds it. Never print
   an upload command's bearer token in the reply.
4. Read it back. Check labels, priority, links and parent before reporting.

## Output format

Reply with the key and URL; type, priority and labels with a reason for each
non-obvious choice; the link made; any open question placed under "Before
starting".

## Gotchas

- Wiki markup in markdown mode is stored as literal text.
- A table nested under a list item can be dropped silently by the tracker
  API. Flat bullets or a top-level table.
- Pipeline and CI work nearly always scores Verification 3 and Risk 3, so 5
  points is its floor.
- The estimate goes in a comment, not the description, so the scoring never
  mixes with the author's words.

## Adapt to your repo

- `PROJ`: your project key; `SRC-1`: the source-ticket project if different.
- Labels table: replace with your vocabulary; keep the one-`area-*` rule.
- Priority names: your tracker's.
- Estimate rubric: keep or delete; if kept, say where the three scores live.
- "Where it lives": point at your package layout.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
