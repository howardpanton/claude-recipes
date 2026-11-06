---
name: ux-design
description: Use when designing or reviewing any user-facing flow - a design ticket or design spike, a story with user-facing flows, a PR that adds or changes UI - or when asked "what states does this screen need?", "where does this action live?", "what should the empty or error state say?", "page or dialog?", "is this consistent with the rest of the app?", "critique this design".
---

# UX design

## Overview

Enumerate every state before drawing a layout, put each action where its siblings put it,
and write the words as part of the design. Tokens and component rules live in the design
system doc; colour, contrast, chips, icons, focus and ARIA live in the `accessibility`
recipe. This recipe links to both and restates neither. The full tables are in
[reference.md](reference.md).

## When to use

- Turning a ticket into states, flows, layout and copy.
- Critiquing a design or a UI diff.

Not for choosing colours or chips (`accessibility`), producing the full deliverable for a
design ticket (`design-ticket` calls this recipe at its method step), or slow pages
(`performance-experiments`).

## Who we design for

| Persona | Doing what | Needs |
| --- | --- | --- |
| Analyst | Checks progress between other tasks, repeating one control | Glanceable status, predictable controls, no reading |
| Admin / engineer | Configuring resources and accounts | Precision, confirmation before consequence, visible system state |
| Reviewer / support | Reading designs and release notes, helping customers | One vocabulary across screens |

Consequences: scan-first layouts; status visible without clicking; the common path short;
the user's own vocabulary; no system constraint leaking into the UI.

## Method

Six steps, each with one artefact and a done-when. Before step 4, re-read the brief and
strike anything that does not serve the job.

| Step | Do | Artefact | Done when |
| --- | --- | --- | --- |
| 1 Brief | Problem, persona, job, constraints (API shape, permissions, scale), what exists today, read from the code | Brief + "Current behaviour (from code)" | The problem is stated without naming a solution |
| 2 States | Enumerate lifecycle x level for every element that can change | State matrix | Every mandatory state has a row and a treatment |
| 3 Flows | Entry points, happy path, every exit (cancel, error, permission denied), where the user lands | Numbered flow per job | Every flow ends where it started or somewhere named |
| 4 Layout | Map regions to shared components; decide where each action lives | Region table (region -> component -> actions) | No region needs a new component without a written reason |
| 5 Copy | Every label, button, message, empty and error text | Copy table with i18n keys | Every string passes the copy rules |
| 6 Critique | Run the checklist | Checklist with a fix or a reason per "no" | No "no" is left unexplained |

"Current behaviour (from code)" is not optional: component file, fetch cadence, columns,
default sort, what the API cannot do. A design that ignores an API limit is rework.

## States

Mandatory for every screen and every status-bearing element: loading; empty (first use);
empty (filtered); partial or stale; error; disabled or locked; permission denied;
validation; pending vs confirmed; not found. Each gets a treatment or an explicit "not
applicable, because". One level per element (Error, Warning, Neutral), never two; icons
only on Errors; all terminal states share one look; two states the UI cannot distinguish
get one merged message, not a guess. Treatments and a worked example: reference.md.

## Information architecture

| Level | Use for | Not for |
| --- | --- | --- |
| List page | Many resources: scan, filter, sort, bulk action | Editing one resource's details |
| Detail page with tabs | One resource; overview first, configuration and history behind tabs | More than ~6 tabs (split the resource) |
| Dialog | One decision, <= ~6 fields, returns to the same context | Multi-step, batch, anything the user leaves and returns to |
| Inline edit | One field, immediate save or explicit confirm | Fields with side effects on other resources |
| Full-page flow | Batch create, wizards, anything with its own URL | Single confirmations |

Where actions live: the page's resource (create, edit, delete) in the page header, right
of the title; the table's (search, filters, columns, bulk) in the table toolbar; one row's
in the row actions menu; one card's in the card footer or header. Name the shared
component for each in the region table.

**Return to context.** Any flow that leaves a resource returns to it with the same tab,
scroll position and filters. The breadcrumb shows hierarchy, never history.

**Prior art first.** `ls libs/shared/ui/src/lib` and name the component you reuse. Legacy
components are not prior art. A new surface needs a written reason the nearest shared
component cannot do the job.

## Interaction rules

The ones most often broken (full table in reference.md): an input shows the next action,
never the current state; show what the app submitted, never what a downstream system is
doing; pending immediately, success only on the API response; disabled controls stay
visible with a reason; system constraints never reach the user; select-all selects the
visible page unless the user chooses "all N".

## Copy rules

Plain, active voice, sentence case. One verb per action across a flow (Create / Delete,
Start / Stop; never Remove and Delete for the same thing). Errors say what happened and
what to do next; codes go in parentheses after the human message. Empty states say why
and offer the one action. Confirmations name the resource and the consequence. Every
string has an i18n key in every locale file. No blame, no "please", no "oops", no
exclamation marks. Patterns with examples: reference.md.

## Critique checklist

Answer yes or no with where you looked; every "no" gets a fix or a reason.

1. Can the user tell what is happening right now without clicking?
2. Do labels use the product's terms, not vendor or internal names?
3. Does every flow have cancel or back that returns to context?
4. Same action, same verb, same place, same component as the sibling screen?
5. Are destructive actions confirmed and invalid inputs blocked before submit?
6. Are options shown rather than remembered (picklists over free text)?
7. Is the common path three interactions or fewer, and keyboard-operable?
8. Is anything on the screen not serving the job?
9. Does every error say cause and action?
10. Does every icon-only control have a tooltip or accessible name?
11. Is every mandatory state designed?
12. Is any system constraint passed on to the user?

For a UI diff, run the PR review gate in reference.md; its findings are Major, while
colour-alone, contrast and missing accessible names stay Critical under `accessibility`.

## Gotchas

- A design that ignores "Current behaviour (from code)" is rework.
- A stale-data threshold is a product decision; propose a default and label it.
- Evidence is a screenshot per designed state from the mock server, not one happy path;
  "users will love it" and "feels faster" are not evidence.

## Adapt to your repo

- Persona table: replace with your users and what each needs.
- Shared component library path (`libs/shared/ui/src/lib`) and the names of the header,
  table, row-menu and card components.
- Locale file location for the i18n grep in the PR gate.
- Design system doc name (tokens, type scale, elevation).
- The vocabulary source your labels must match.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
