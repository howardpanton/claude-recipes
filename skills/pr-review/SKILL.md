---
name: pr-review
description: >-
  Use when asked to review a pull request, branch or diff before it merges to
  the integration branch in a monorepo of git submodules - "review this PR",
  "is this pointer bump safe to merge?", "what does this branch pull in?",
  "will this fail the pre-push gate?", "does this shared-lib change break
  anyone?" - or whenever a diff shows a one-line "Subproject commit" change.
  Read-only - produces a written review, never edits or merges.
---

# PR review (submodule-aware)

## Overview

In a monorepo of git submodules the costliest review mistake is missed
cross-repo ripple: a one-line `Subproject commit` change can hide a large
behavioural change, and a changed shared-lib export can break a consumer in
another repo. Review pointer movement first, then the gates the repo actually
enforces, then everything else. Read-only: a review, not edits; never merges.

## When to use

- A PR, branch or diff is about to merge into `<integration-branch>`.
- A diff moves a submodule pointer and someone asks what it pulls in.
- A change touches `libs/shared/*` and you need to know who it breaks.

Not for: writing the PR body (`pr-description` skill); deciding how a change is
branched, committed or landed (`change-control` skill); a last look at your own
staged diff before `git push` (`pre-push-reviewer` agent). If ownership is
unclear before you can review, dispatch the `repo-navigator` agent first.

## Procedure

### 1. Establish the range

```bash
git rev-parse --abbrev-ref HEAD
git fetch origin <integration-branch> --quiet
git diff origin/<integration-branch>...HEAD --stat
```

Three dots: diff against the merge base, so you review only what this branch
added. If the user gave an explicit base, range or PR branch, use that.

### 2. Detect submodule movement FIRST

```bash
git diff origin/<integration-branch>...HEAD --submodule=short -- apps/
git diff origin/<integration-branch>...HEAD --submodule=log   -- apps/
```

For every bumped submodule the pointed-to commits are part of the PR, not an
opaque hash:

- `cd` into it and read `git log --oneline <old>..<new>` and `git diff <old>..<new>`.
- Confirm the new commit is reachable on the submodule's default branch:
  `git -C apps/<feature> branch -r --contains <new>`. A pointer with no merged
  child PR behind it may pin an unmerged or force-pushed commit that CI cannot
  resolve.
- Say in the review that merging requires the child commit to be on its default
  branch first.

### 3. Map ownership and cross-repo ripple

| Changed area | Ripple | Check |
|---|---|---|
| Shared-lib public export (`libs/shared/*/src/index.ts`) | Breaking surface | `grep -rn "SymbolName" apps/ src/ --include='*.ts' \| grep -v spec`; list every consumer |
| Shared-lib internals, barrel unchanged | Local to the lib | Its own specs |
| Submodule internals, barrel unchanged | Local to that repo | None |
| Submodule barrel (`src/index.ts`) changed | Shell and sibling packages may break | Enumerate consumers |

Name every repo a merger must land, in order: child PRs first, then the parent
pointer bump plus any shared-lib change.

### 4. Review against the enforced gates

The repo's real rules are the rubric. Read the pre-push hook and the root
instructions file for the current list; typically:

- Every changed testable source file (component, service, directive, pipe,
  guard - whatever the hook lists) has a sibling spec, new or updated.
- `<lint-cmd>` passes on every changed file.
- Coverage of each touched project clears `<coverage-threshold>`; flag new
  branches with no test exercising them.
- House conventions: framework idioms, imports through package barrels (never
  deep paths), no hard-coded API hosts, the agreed state-management and
  feature-flag/permission helpers.
- Commit and branch naming as in the `change-control` skill.

**Skill-drift gate.** If the diff changes a fact a skill cites (a dependency
pin, a threshold, a bootstrap chain, a storage key, a polling interval), the
same PR must update that skill. A missing update is Critical: a stale skill
feeds wrong context to every future reader, human or agent.

### 5. Regressions, security, maintainability

- Regressions: changed conditionals, defaults or signatures; removed null
  checks; changed error paths; deleted load-bearing code. Would existing specs
  catch it?
- Security: template injection/XSS, secrets in code, sensitive data logged,
  missing auth or permission checks on a new route or action, unvalidated input
  reaching HTTP calls.
- Maintainability: dead code, copy-paste, swallowed errors, over-clever logic.

### 6. Optionally run what you can

If the working tree is on the branch: `<lint-cmd>` and the affected specs only
(`<test-cmd> --testFile=<spec>`). Don't run the full suite unless asked.

## Output format

Use `review-template.md` in this directory: impact block first, then
Critical / Major / Minor findings (each `path:line` plus a concrete fix), then
Gates, Security, Strengths and an ordered action list. Verdict tokens are
APPROVE, APPROVE-WITH-NITS, CHANGES-REQUESTED; severities Critical (blocks
merge), Major (should fix), Minor (nit). The pipeline's reviewer and the
pre-push reviewer use the same words.

## Gotchas

- **Two-dot vs three-dot.** `base..HEAD` includes everything that landed on the
  base since the branch forked; the review balloons with code the PR never
  touched. Always `base...HEAD`.
- **A pointer is part of the PR.** A green parent diff can hide a large change
  living entirely inside a bumped submodule. Always step in.
- **Stale or detached submodule checkouts.** `git submodule status`: a leading
  `-` is uninitialised, `+` means the checked-out commit differs from the
  recorded pointer. If the checkout is not on the PR's pointer your reading of
  it is wrong - `git submodule update --init --recursive` first.
- **Barrel vs internal.** A symbol changing inside a package only ripples
  outward if it crosses `src/index.ts`. Check before claiming a break.
- **Local config noise.** A modified dev-proxy or local environment file is
  usually the machine's "point at a deployed env" state, not the PR. Confirm it
  is in the branch diff before flagging it.
- **No git-host CLI.** Review the local branch diff; ask for the PR
  description or ticket rather than guessing intent.

## Adapt to your repo

- `<integration-branch>`: the PR target (`develop`, `main`).
- `apps/`: the directory that holds submodules; check `.gitmodules`.
- `libs/shared/*/src/index.ts`: your shared-lib barrel paths.
- Step 4's gate list: copy it from your pre-push hook and root instructions file.
- `<lint-cmd>`, `<test-cmd>`, `<coverage-threshold>`: your commands and floor.
- Delete the skill-drift gate if you keep no skill library.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
