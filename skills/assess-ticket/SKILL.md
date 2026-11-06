---
name: assess-ticket
description: >-
  Use when the user shares a ticket key or URL and asks whether it is ready to
  develop, asks to review or improve a ticket, wants to check it has good
  acceptance criteria, wants non-functional concerns (performance, security,
  accessibility, observability, i18n) validated, or pastes ticket text and asks
  for feedback. Also use before recommending any edit to a ticket. Not for
  writing a new ticket from scratch.
---

# Assess ticket

## Overview

Judge a ticket against the codebase it will change, not in the abstract, and
produce a verdict a developer or an agent can act on. Edits go back to the
tracker as an enriched description, never as a rewrite that discards the
author's words.

## When to use

- "Is PROJ-123 ready?", "review this ticket", "are these ACs good?", "did
  anyone think about accessibility?"
- Not for: raising a new ticket (`write-ticket`), duplicate hunting, starting
  work (`start-ticket`). Inside `ticket-pipeline` the `ticket-assessor` agent
  runs this rubric headless: it reads a saved snapshot and writes proposals
  instead of asking.

## Procedure

### 1. Fetch the ticket

- **Jira:** `getJiraIssue`, `responseContentFormat: markdown`, with issue
  links; then `listJiraIssueComments`. Open questions often live only in
  comments.
- **GitHub:** `gh issue view <n> --json title,body,labels,comments`.

Need: summary, description, ACs (description or a custom field), type,
priority, status, labels, links.

### 2. Ground it in the code

A targeted search, not a full read: grep for the nouns in the ticket and the
components, services and interfaces they name. Verify every path, root-cause
claim and value the ticket asserts; confirm or correct each one. Skim the
repo's coding and security guidelines only when the ticket touches those
areas.

### 3. Score six dimensions

| Dimension           | Pass when                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| User story          | Who (role), what, why (business value) all present; one need per ticket                              |
| Acceptance criteria | GIVEN/WHEN/THEN or equivalent; specific and testable; cover happy path, edge cases and failure states |
| NFRs                | Each relevant row below addressed or explicitly N/A                                                   |
| Codebase impact     | Affected files and packages named; shared-library ripple identified; existing patterns to reuse named |
| Test impact         | Unit specs to add or update and E2E scenarios listed as checkboxes with file paths                    |
| Dependencies        | Blocking tickets or PRs, sibling packages needing parallel change, missing links                      |

NFR checks. Use judgement: a CSS-only change has no security row.

| NFR           | Ask                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------- |
| Performance   | Loops, large lists, template bindings, change-detection cost? Pagination or virtualisation? A performance ticket needs a numeric target (p75/p95 and the scale it holds at) |
| Security      | User input, API data, permissions, sensitive content? XSS, injection, auth risks?         |
| Accessibility | New or changed UI? Roles, keyboard, focus order, contrast?                                |
| Observability | Should failures be logged or alerted?                                                     |
| i18n          | New user-facing strings? Are they in the translation layer?                               |

**Design gate.** If the ticket is flagged as needing design (a "design
required" field, a `needs-design` or `involves-ux` label) and no design link
exists anywhere - description, links, comments - the verdict is at best
Needs refinement and the next action is "raise or link a design ticket". UI
is not built before design.

**Pipeline-readiness flags.** Set them whenever an agent may run the ticket:

```
Profile: story | bug | spike | task | design   (default from issue type; override with a reason)
Pipelineable: yes | no - <reason>              (no = no repository change: ops, admin, drills)
Design reference: <url> | none
Perf-relevant: yes/no - <which page or list>
Feature-flag work: yes/no
User-facing flows: yes/no                      (drives the E2E requirement downstream)
```

### 4. Report, then wait

Present the verdict (format below) and ask: "Does this look right? Anything
to adjust before I update the ticket?" Nothing is written before the answer.

### 5. Propose edits without overwriting

- **Jira:** `editJiraIssue` on the description, `contentFormat: markdown`.
- **GitHub:** `gh issue edit <n> --body-file <file>`.

Rules:

- Keep the author's story and context verbatim. Add or sharpen ACs; append
  the missing sections (NFRs, design questions, dependencies, how to test,
  expected size).
- Everything goes into the description so the ticket is self-contained. No
  "see my comment".
- Send real Markdown. Wiki markup (`h2.`, `{code}`) in markdown mode is
  stored as literal text.
- Do not nest a table under a list item; the API can drop the whole item
  silently. Flat bullets or a top-level table.

## Output format

```markdown
## Ticket Assessment: PROJ-123 - <summary>

### Overall readiness
Ready | Needs refinement | Not ready - <one-sentence reason and next action>

### User story
Clear | Needs work | Missing - <quote the weak part>

### Acceptance criteria
Good | Gaps | Missing or untestable
- Gap: <what>
- Suggested: GIVEN <context> WHEN <action> THEN <outcome>

### Non-functional requirements
- Performance / Security / Accessibility / Observability / i18n: Covered | Consider <x> | N/A

### Test impact
#### Unit
- [ ] New | Update: <spec file - what it must cover>
#### E2E
- [ ] New scenario in <spec> | New spec <path>: <scenario>

### Codebase impact
- <file or package> - <why>; shared-library ripple: yes/no

### Dependencies
- <ticket, PR, or missing link>

### Pipeline flags
<block from step 3>

### Recommended changes to the ticket
1. <specific: "Add AC: GIVEN ... WHEN ... THEN ...">
```

## Gotchas

- "ACs could be better" is useless. Quote the gap and write the replacement
  AC.
- Separate "must fix before development" from "nice to have". A clear story
  with vague ACs is Needs refinement, not Not ready.
- Do not expand scope with tangential concerns; list them as follow-ups.
- Copy-pasted campaign tickets sometimes carry another ticket's body. When
  summary and body disagree, trust the summary and say so.
- A verdict other than Ready must name the next action: "link the design",
  "split", "agree X with the owner".

## Adapt to your repo

- `<ticket-tracker>`: keep the Jira or the GitHub fetch and edit lines.
- Design gate: name the field or label your tracker uses for "design
  required".
- Test impact: rename the two layers to your runners (Jest or Vitest;
  Cypress or Playwright) and their spec locations.
- NFR table: add rows your product cares about (offline, data residency);
  delete the ones it does not.
- `evals/evals.json`: replace the example prompts with tickets from your own
  backlog once you have human-approved ground truth.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
