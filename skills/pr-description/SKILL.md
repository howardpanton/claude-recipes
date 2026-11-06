---
name: pr-description
description: >-
  Use when writing or rewriting a pull request title and description - "write
  the PR description", "open a PR", "this PR body is too long", "turn this
  changelog into a PR", a reviewer or pipeline stage that must hand back a PR
  body, or any PR in a monorepo of git submodules where a child-repo PR and a
  parent pointer-bump PR must link to each other.
---

# PR description

## Overview

A reviewer should know why this PR exists and what it changes in under 30
seconds. The diff already shows every file; the description is not a second
copy of it.

## When to use

Any time a PR is opened or its body rewritten. Not for the review itself
(`pr-review` skill) or for deciding branch/commit format (`change-control`
skill - this skill only sets the title rule).

## Template

```markdown
<One sentence: what changes for the user or operator, in plain words.>

**Why:** <1-2 sentences: the problem and who it hurt.> [PROJ-123](<ticket-url>)

**What changed**
- <behaviour change, in product words>
- <at most 5 bullets>

**Screenshots**
| Before | After |
| --- | --- |
| {{image:1}} | {{image:2}} |

**Links**
- Child repo PR: [<repo> #<n>](<url>) - merge first
- Parent PR: [<repo> #<n>](<url>)
- CI: [<branch>](<build-url>)

**Tested:** <one line of numbers>

**Reviewer notes**
- <only what needs a human decision or action>
```

**Title:** `[PROJ-123] <imperative summary, 70 chars or fewer>`. No conventional
`type:` prefix on ticket PRs - see the `change-control` skill for why.

## Rules

- **Short.** Everything above the screenshots fits on one screen: about 20
  lines, about 150 words. If you are writing a paragraph, cut it.
- **Lead with purpose, not mechanics.** "UK users saw `G` instead of `GMT`
  next to every time" - not "`getTimezoneAbbreviation` now prefers the short
  name".
- **What changed = behaviour, not files.** Name a file only when the file is
  the change (a shared util, a config, a flag). No per-file changelog, no
  function names, no line counts.
- **Screenshots for anything user-visible**, before and after. Never commit
  them to the repo. Save them outside the repo and attach them when creating or
  updating the PR through the git host's CLI or API (GitHub, Bitbucket); each
  `{{image:N}}` placeholder stands for the Nth attachment, on its own line or
  table cell. With no image to hand, write `<!-- attach: what to capture -->`
  and name the gap in your final message. Drop the section for non-UI changes.
- **Links are mandatory.**
  - CI: always the parent-repo job for the parent branch, because submodules
    have no pipeline of their own. Build the real URL; no placeholders.
    **Jenkins:** encode `/` in the branch as `%252F`
    (`feature/PROJ-123-x` -> `feature%252FPROJ-123-x`).
  - Parent PR: list every child PR it bumps, each marked "merge first".
  - Child PR: link the parent PR that bumps its pointer. If the parent does
    not exist yet, open the child first, then edit it to add the link.
  - Omit a link line only when it genuinely does not apply.
- **Tested is one line of numbers.** Counts and coverage, not narrative.
  Red-to-green repro detail, mutation checks, E2E tables and QA sweeps go in
  the review comment, not the description.
- **Reviewer notes are optional** - at most 3 bullets, only things a human must
  decide or do. Delete the heading if there are none. No "How to test" section
  unless the steps are non-obvious; then at most 3 steps under Reviewer notes.
- No acceptance-criteria tables, no review verdict, no blast-radius dump. If a
  shared-lib export changed, one Reviewer-notes bullet naming the consumers is
  enough.

## Example (good)

```markdown
Invoice timestamps show `GMT` again for UK users, instead of `G`.

**Why:** after a browser timezone-data update, the label read `G` for London and `CEST` all winter for Paris - operators reconciling invoices across regions misread times. [PROJ-123](https://<ticket-tracker>/browse/PROJ-123)

**What changed**
- Timezone labels prefer the browser's real abbreviation (`GMT`, `CET`), then initials, then an offset (`GMT+3`)
- Fixed once in the shared date util, so the invoice list, the audit log and the export header all pick it up

**Screenshots**
| Before | After |
| --- | --- |
| <!-- attach: invoice list header, Europe/London --> | <!-- attach: same, after --> |

**Links**
- CI: [feature/PROJ-123-timezone-abbreviation](https://<ci>/job/<repo>/job/feature%252FPROJ-123-timezone-abbreviation/)

**Tested:** Jest 400 passed; coverage 90.1/85.3/92.0/91.4; ESLint clean; E2E reports 12/12

**Reviewer notes**
- The shared date util is consumed by three apps; the full consumer list is in the review comment
```

## Gotchas

- A long AI changelog is the default failure mode. If the body lists files or
  functions, it is a diff, not a description - rewrite it as behaviour.
- "Tested: all green" is not evidence. Numbers or nothing (the
  `validation-and-qa` skill says what counts).
- A parent PR without "merge first" on its child links gets merged in the
  wrong order, and the pointer then references a commit nobody can fetch.
- Screenshots committed to the repo bloat every future clone. Attach, never
  commit.

## Adapt to your repo

- `<ticket-url>`: your tracker's issue URL pattern (Jira `/browse/KEY`, GitHub `/issues/N`).
- `<build-url>`: your CI job URL pattern; delete the Jenkins encoding note if not Jenkins.
- `{{image:N}}`: keep only if your PR tooling resolves placeholders; otherwise paste the host's image markdown directly.
- Child/Parent PR lines: delete if the repo has no submodules.
- Title format: match the `change-control` skill's commit convention.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
