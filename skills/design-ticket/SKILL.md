---
name: design-ticket
description: Use when a Design-type ticket or a design spike needs its design produced - "design PROJ-123", "/design-ticket PROJ-123", "prototype this screen", "write the state matrix for this screen", "draft the follow-up stories from the signed-off design" - or when a ticket pipeline's assessor classified a ticket as design work, or when a ticket carries a design reference (Figma, Magic Patterns) that must become an implementation plan.
---

# Design ticket

## Overview

Draft and prepare; the human finishes. The brief is the durable artefact and the artboards
are its picture. Every external write (ticket comment, link, transition, wiki edit, story
creation) is confirmed with the user first, and a human signs off.

## When to use

- A Design-type ticket, or a spike with something visual to decide.
- A story the pipeline's assessor reclassified as design work.

Not for a story that merely references a design (the ticket pipeline fetches it and the
planner writes the design mapping), a technical spike with nothing visual, or colours and
chips (`accessibility`). The method itself is `ux-design`; this recipe calls it at step 3.

Run in the main session, not as a subagent: you need the artifact tool, the tracker tools
and the user.

## Arguments

`/design-ticket <TICKET> [--stories]`

- `<TICKET>`: the key, required.
- `--stories`: after sign-off, draft follow-up stories from the signed-off artboards
  (step 7). Without it, stop after step 6.

## Step 0: type guard

Fetch the ticket with comments, links and remote links. Proceed only when the issue type
is Design, or it is a spike (or a task whose summary starts `Spike:`) marked as needing
design, or the assessor already set the design profile in the ticket's handover
directory. Anything else: stop and name the sibling recipe; never produce a brief for a
plain story. Record the epic, issue links and comments; design links and product
decisions usually live in the comments.

## Steps 1-6

Pause after step 4. Nothing external happens before step 6.

| Step | Do | Output |
| --- | --- | --- |
| 1 Read | The ticket, its epic, the PRD and UX pages it links, any earlier design (design-tool share links, artifacts, Magic Patterns). Expect the house shape (problem, business value, in scope with states, out of scope, ACs); list what is missing under open questions | Context notes |
| 2 Prior art from code | Locate the current screen: component files, shared components used, states already handled, polling cadence, what the API can and cannot do | "Current behaviour (from code)" |
| 3 Method | **REQUIRED:** use the `ux-design` recipe (method, states, IA, interaction rules, copy rules), `accessibility`, and the design system doc. Work its steps 1-5. Every state and string traces to the ticket, the epic, the code, or an open question; never an invented requirement | Brief sections |
| 4 Brief | Write the brief from [brief-template.md](brief-template.md) and show it. **Pause.** The user reviews and edits | `design-brief.md` |
| 5 Artboards | One artboard per row of the state matrix, using the design system's tokens, each annotated with the ticket key it covers. Default: a design artifact from the artifact tool; alternative: the user pastes the brief into a design tool and hands back the share link | Artifact URL or share link |
| 6 Bookkeeping | Each write confirmed: (a) ticket comment with the design link, the data-needs table and the open questions; (b) remote link on the ticket and the epic; (c) the link on the UX wiki page the ticket names (ask which if none); (d) transition to the design-review status, matched by name not id. Then stop; sign-off is the product owner's and lands as comments or follow-up tickets | Tracker and wiki updates |

## Step 7: `--stories` (after sign-off)

Only when the ticket is in design review with sign-off recorded, or the user says so. For
each group in the brief's artboards table, draft a story:

1. User story (as a / I want / so that), then business value.
2. Context, then GIVEN/WHEN/THEN ACs naming the artboard and the states it covers.
3. Accessibility ACs: keyboard-operable, visible selected state, state not shown by
   colour alone, new strings translated.
4. NFRs where touched, out of scope, dependencies (the design ticket, any API gap from the
   data-needs table).
5. Fields: parent = the epic; the design-required marker set; labels per the team
   taxonomy; the canvas link as the design reference.

Show every draft. Create only after confirmation, then link each story to the design
ticket. **Jira:** the create screen may reject some fields (components); set them with an
edit afterwards.

## From a design reference to an implementation plan

When a story carries a design link (Figma, Magic Patterns, a design artifact) rather than
needing a design produced:

1. Fetch the design through its tool's MCP or export; list every screen and state it
   shows.
2. Build a mapping table: design element -> existing shared component (or "new, because")
   -> file to change -> states covered -> strings and their i18n keys.
3. Note every deviation the code forces (an API field the design assumes but which does
   not exist; a state the design omits) under open questions.
4. Hand the table to the planner as the plan's design mapping section; the reviewer
   checks the implementation against it and expects deviations to be named in the PR.

## Output format

The brief (brief-template.md): nine H2s kept verbatim. The data-needs table is the input
the next API spike asks for; the artboards table is what `--stories` and the planner's
design mapping consume.

## Guardrails

- No external write without a yes in this session. The brief alone is a zero-side-effect
  dry run.
- Do not invent requirements. A state or string you cannot trace goes under open
  questions, not into the design.
- Reuse before new: name the shared component for every region; a new surface needs a
  written reason.
- Decisions go on the ticket, not in chat.

## Gotchas

- Match the design-review transition by its target status name; ids change.
- A design that ignores an API limit found in step 2 is rework; put the limit in data
  needs.
- Design tools without an MCP connection still work: paste the brief, take back the
  share link.
- Keep the nine headings verbatim; downstream tooling greps for them.

## Adapt to your repo

- `<handover-dir>`: where per-ticket working files live (git-ignored).
- `<ticket-tracker>`: the issue type and field that mark a ticket as needing design, the
  design-review status name, and your label taxonomy.
- The design tool you use for artboards and whether it has an MCP connection.
- The product owner who signs off and where sign-off is recorded.
- The pipeline planner's expected heading for the design mapping, if you run one.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
