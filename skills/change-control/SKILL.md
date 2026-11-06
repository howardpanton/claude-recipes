---
name: change-control
description: >-
  Use when deciding how a change is classified, gated, branched, committed or
  landed in a monorepo of git submodules - "what branch/commit format?", "can I
  push with --no-verify?", "how do I bump a submodule pointer?", "why is my
  push blocked?" (lint failure, missing sibling spec, coverage below
  threshold), "which repos does this change touch?", "why did my docs commit
  cut a release?", "who edits the deployment pin file?", or questions about
  the PR flow, landing order and who merges.
---

# Change control

## Overview

Classify every change before touching code: the class decides which repos you
must commit to, what can break, and how much review it needs. Then follow the
gates exactly - they exist because bypassing them has leaked untested code and
wrong submodule pins onto the integration branch.

## When to use

Any time you branch, commit, bump a pointer or open a PR. Not for running the
review (`pr-review` skill), writing the PR body (`pr-description`), proving a
change works (`validation-and-qa`), or diagnosing a failing test
(`debugging-playbook`).

## 1. Change classification

| Class | Where the edit lives | Repos to land | Extra care |
|---|---|---|---|
| **Shell** | `src/` (routing, global init, composition) | Parent only | No business logic. Bootstrap and environment-switch edits affect every feature: treat as cross-cutting. |
| **Feature package** | `apps/<feature>/` (a git submodule) | **Two**: the child repo (its own PR) and a parent pointer bump | Shows in the parent diff as one `Subproject commit` line (section 5). Barrel untouched = local blast radius. |
| **Shared lib** | `libs/shared/*` | Parent, consumed by every feature | Grep consumers before changing any public export: `grep -rn "SymbolName" apps/ src/ --include='*.ts' \| grep -v spec`. A changed `index.ts` export is a breaking surface. |
| **Cross-cutting** | shared lib + feature(s), or shell + lib + feature | Parent + every affected child | Most dangerous. Enumerate every repo a merger must land, in order. Consider a feature flag. Dispatch the `repo-navigator` agent if unsure. |

## 2. Branches and commits

- Branch: `feature/PROJ-123-short-description` (also `fix/`, `hotfix/`,
  `release/<name>`). Never push to `<integration-branch>` or `<release-branch>` directly.
- **Ticket work:** `[PROJ-123] Description`. No conventional type, so it never
  cuts a release.
- **Everything else:** conventional `type(scope): subject`.
- **The semantic-release trap.** On `<integration-branch>`, semantic-release
  reads commit types. With custom release rules, `docs:`, `chore:`, `test:`,
  `ci:`, `style:` and `build:` can all cut a **patch**, and `refactor:` a
  **minor** - a README fix redeploys the app. The opt-out is the scope
  `no-release` (`docs(no-release): fix setup steps`), mapped to
  `"release": false` in `.releaserc`. Check `.releaserc` before assuming any
  type is inert.

## 3. The pre-push gate, in full

| Stage | What it does | Fails when |
|---|---|---|
| Lint | `<lint-cmd>` on every changed `.ts`/`.html` in the pushed range (specs excluded) | Any lint error |
| Sibling spec | Every changed component/service/directive/pipe/guard file must have `<name>.spec.ts` beside it | Any testable file lacks its spec |
| Targeted tests | A runner groups changed files by project, runs that project's tests with coverage, reads `coverage/<project>/coverage-summary.json` | Any test fails, or any of statements/branches/functions/lines < `<coverage-threshold>` for a touched project |
| Submodule recursion | Repeats the stages inside each submodule - **may be inert**: a `[ -d "$sm/.git" ]` test never fires when `.git` is a gitfile (the normal `submodule update --init` result) | Effectively never |

Things that save time:

- The range is `remote_sha..local_sha` per pushed ref: a **brand-new branch
  diffs its whole history** and can trip on files you never touched today.
- If recursion is inert, a child repo's only local gate is its **own** hook;
  with none, run the checks by hand before pushing there.

## 4. The two non-negotiables

**Rule 1 - never push with `--no-verify`, except a documented emergency.** The
hook's own message advertises the bypass; that is how untested code leaks in.
Because coverage is enforced on changed files, a bypassed push makes the
*next* person's push fail on files they did not write. Allowed only for a
production hotfix the gate blocks; the rationale **must** be in the PR body.

**Rule 2 - never hand-edit the deployment pin file** (`<deploy-pin-file>`,
e.g. `deploy-pins.yaml`: one version per environment). It is bot-managed and the
most-churned file in the repo; bad pins mean rollbacks. Pins change through
the deployment flow, never in a feature PR. If it shows in your diff, remove
it. Block agent edits with a PreToolUse hook on `Edit|Write` for that path.

## 5. Submodule pointer bumps

Full procedure and checks: `pointer-bump.md` in this directory. The short
version:

1. Land the child PR first.
2. `git -C apps/<feature> fetch origin && git -C apps/<feature> checkout origin/<integration-branch>`
3. `git diff --submodule=log -- apps/<feature>` - **read** what it pulls in.
4. Commit the one-line pointer with "bump" in the message.
5. `git submodule status` - nothing else moved?

**Invariant:** the pointer must reference a commit **reachable on the child's
default branch**; anything else breaks `git submodule update` for everyone
and for CI. Before committing: `branch -r --contains <sha>` (the child PR may
have landed on a release branch), fetch the child's real tip rather than
trusting the parent's stale pin, and confirm the PR base.

A merge commit can move pointers you never touched: run `git submodule status`
after every merge or rebase. Fix a regression by re-bumping **forward**, never
by reverting across it.

## 6. PR flow and landing order

1. Child PR(s) merge first.
2. Then the parent PR with the pointer bump (plus any shared-lib change).
   Never merge a parent whose pointer references an unmerged child branch.
3. **Merges are human-only.** An agent never merges, never auto-merges.
4. Merging to `<integration-branch>` *is* releasing to the first environment -
   there is no later publish step to catch mistakes.

## Gotchas

- The hook's bypass hint ("or bypass with --no-verify") reads like permission.
  It is not.
- A `chore:` commit from a dependency bot can cut a release too; scope it
  `no-release` or accept the version.
- A hand-typed pointer SHA with one wrong hex digit fails every branch build
  at checkout. Let `git checkout` set it; never type one.

## Adapt to your repo

- `<integration-branch>`: PR target and semantic-release branch.
- `apps/`: your submodule directory; `libs/shared/*`: your shared libs.
- `<lint-cmd>`, `<coverage-threshold>`: from your pre-push hook.
- Section 2's release rules: copy the real list from your `.releaserc`.
- `<deploy-pin-file>`: name it, or delete Rule 2 if deployments pin elsewhere.
- Delete section 5 and the child/parent ordering if you have no submodules.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
