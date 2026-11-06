---
name: start-ticket
description: >-
  Use when the user asks to start a ticket, prepare a branch for an issue, spin
  up a worktree for a ticket, or set up root-repo and package/submodule branches
  before any code is written. Triggers: "start PROJ-123", "set up a worktree for
  this ticket", "prepare branches for PROJ-123 in the root repo and whatever it
  touches", "kick off this ticket before coding". Not for judging whether the
  ticket is ready, and not for implementing it.
---

# Start ticket

## Overview

Turn a ticket into a ready-to-code workspace: a sibling worktree on
`feature/PROJ-123-short-slug`, the same branch in every package or submodule
the ticket touches, all published. No feature code is written here, and no
mutating git command runs before the user has seen the plan.

## When to use

- The user names a ticket and wants branches, a worktree, or "to start".
- Not for: judging readiness (`assess-ticket`), raising a ticket
  (`write-ticket`), or driving the ticket to a PR (`ticket-pipeline`, which
  performs this same setup itself before its develop stage).

## Procedure

Always in this order. Step 4 is never skipped.

### 1. Fetch the ticket first

Accept a key (`PROJ-123`) or a tracker URL; extract the key.

- **Jira:** `getJiraIssue` via the Atlassian MCP, `responseContentFormat: markdown`.
- **GitHub:** `gh issue view 123 --json title,body,labels,state,assignees`.

Minimum fields: summary, description, type, status, labels, assignee. If the
fetch fails, stop and report exactly what failed. Never infer a ticket from
its key.

### 2. Optional design step

If the ticket carries a design reference (a design-tool share link, an
exported canvas, an artifact URL), run the `design-ticket` skill (section "From a
design reference to an implementation plan") first and feed its scope into step 3. A ticket that mentions a design but has no
usable link: stop and ask for it.

### 3. Decide scope from the area map

Decide whether the ticket touches the root repo only, one package or
submodule, or several plus the root. Ground it in repo facts:

- `references/area-map.md` - the maintained "feature language -> path" table.
  Primary lookup.
- `.gitmodules` or the workspace config (`nx.json`, `pnpm-workspace.yaml`) -
  only to verify the map is still current.
- `grep -ril '<feature noun>' apps libs` - when the map has no row.

Ambiguous? Default to the root branch, list suspected packages as candidates,
and let the user confirm them in the plan. Never create submodule branches
without evidence.

### 4. Present the plan before any mutating git command

```markdown
## Start Ticket Plan

Ticket: PROJ-123 - <summary>
Scope: root only | root + 1 submodule | root + N submodules

Worktree: <absolute sibling path>
Branch: feature/PROJ-123-<slug>

Submodules to prepare:
- <path> - <why, quoting the ticket>

Steps:
1. git fetch origin --prune
2. Create or reuse the worktree
3. git submodule update --init --recursive inside it
4. Create or attach the branch in each listed submodule
5. Push root and submodule branches to origin
```

Ask for confirmation in one sentence. If the user approved the setup earlier
in the same conversation, still show the plan, then proceed.

### 5. Naming

- Branch: `feature/PROJ-123-short-slug` - lowercase, hyphens, the key kept
  verbatim, slug from the summary, under about 40 characters.
- Worktree: a sibling of the repo, `../<repo>-proj-123`. If it exists, reuse
  it only when it is on the same branch; otherwise suffix `-2` and say so.

### 6. Root worktree

From the repo root, based on `<integration-branch>` unless told otherwise:

```bash
git fetch origin --prune
BRANCH=feature/PROJ-123-short-slug
WT=../<repo>-proj-123

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; then
  git worktree add "$WT" --detach
  git -C "$WT" checkout -b "$BRANCH" --track "origin/$BRANCH"
else
  git worktree add -b "$BRANCH" "$WT" "origin/<integration-branch>"
fi
git -C "$WT" submodule update --init --recursive
```

An existing worktree for that branch is reused, never duplicated. Never
remove or reset an existing worktree unless asked.

### 7. Submodule branches (inside the worktree)

For each selected path, confirm it is an initialised git repo, then:

```bash
git -C "$WT/<path>" fetch origin --prune
# branch is new:
git -C "$WT/<path>" checkout -b "$BRANCH" "origin/<integration-branch>"
git -C "$WT/<path>" push -u origin "$BRANCH"
# branch already on the remote:
git -C "$WT/<path>" checkout -b "$BRANCH" --track "origin/$BRANCH"
```

A submodule's integration branch can differ from the root's; check
`git -C "$WT/<path>" symbolic-ref refs/remotes/origin/HEAD`. A missing or
uninitialised submodule stops the run with the path named.

### 8. Publish the root branch

```bash
git -C "$WT" push -u origin "$BRANCH"
```

Publishing an empty branch is intended: CI and colleagues can see it at once.
A push rejected by permissions or branch protection is reported verbatim and
stops the run.

## Output format

```markdown
## Ticket Started

Ticket: PROJ-123 - <summary>
Worktree: <absolute path>
Branch: feature/PROJ-123-<slug>

Published branches:
- root: feature/PROJ-123-<slug>
- <submodule path>: feature/PROJ-123-<slug>

Notes:
- <reused / skipped / ambiguous>
- <before coding: install dependencies, copy git-ignored local config>
```

Say explicitly when only the root branch was created.

## Gotchas

- A submodule branch created in the main checkout instead of the worktree
  leaves the user's own checkout sitting on a feature branch. Always
  `git -C "$WT/<path>"`.
- `git worktree add` does not initialise submodules. Without step 6's
  `submodule update` every submodule directory is empty and the first build
  fails with an unhelpful error.
- A fresh worktree has no `node_modules` and none of the git-ignored local
  config. Say so in Notes: the pre-push hook dies without dependencies.
- Three-dot vs two-dot, for later: `git diff <integration-branch>...HEAD`
  shows only this branch's work; `..` also includes everything that landed on
  the integration branch since. `--submodule=log` adds the submodule commits.
- One word can name two things (a page and a package that does not render
  it). The area map carries disambiguation rows; read them before picking a
  path. Learned the hard way.
- Never `worktree prune`, `reset --hard` or `checkout -- .` inside this skill.

## Adapt to your repo

- `<integration-branch>`: the branch work is based on (`develop`, `main`).
- `<repo>`: the directory name used in the worktree path pattern.
- `references/area-map.md`: replace the example rows with your packages;
  delete steps 3 and 7's submodule parts if you have none.
- Tracker fetch (step 1): keep the Jira or the GitHub line.
- Step 2: name your design-planning skill, or delete the step.
- Branch pattern: change `feature/PROJ-123-short-slug` only if CI parses a
  different shape.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
