---
name: tidy-worktrees
description: >-
  Use when asked to "tidy up worktrees", "clean up worktrees", "audit
  worktrees", "which worktrees can I remove?", when `git worktree list` has
  grown past what anyone remembers creating, or after an automated ticket run
  leaves sibling checkout directories behind. Report-only: never runs the
  removal, always ends with copy-pasteable commands for the user.
---

# Tidy worktrees

## Overview

Tell the user exactly which worktrees are safe to delete and why, with
copy-paste commands - and never delete anything yourself. Deleting a worktree
with live unmerged work is a real loss; a false "safe to remove" is the
failure mode to avoid, so verify, don't guess.

## When to use

Any worktree audit. Not for creating worktrees (`start-ticket` skill) or
deciding what to do with an unmerged branch (`change-control`).

## Procedure

### 1. Enumerate

```bash
git worktree list
```

Skip the main checkout (first row). Note path and branch for every other row.

### 2. Fetch every branch that counts as "merged"

`<integration-branch>` is not the only merge target when the repo also runs
release branches; they can diverge by hundreds of commits, and a worktree may
have been merged into an older release branch that is still relevant.

```bash
git fetch origin <integration-branch> --quiet
git fetch origin $(git branch -r | grep -o 'release/[A-Za-z0-9._-]*' | sort -u | tr '\n' ' ') --quiet
```

### 3. Per-worktree merge check

In each worktree directory:

```bash
git branch --show-current
git merge-base --is-ancestor <branch> origin/<integration-branch> && echo "merged -> <integration-branch>"
for r in $(git branch -r | grep -o 'origin/release/[A-Za-z0-9._-]*' | sort -u); do
  git merge-base --is-ancestor <branch> "$r" && echo "merged -> $r"
done
```

Merged into any of them: the branch's own work is safe. Merged into none: do
not recommend removal - go to step 5.

### 4. Real uncommitted work vs noise

```bash
git status --short
git diff --submodule=short
git submodule foreach --quiet 'git status --short | wc -l | xargs echo $name:'
```

Noise, safe to ignore:

- Submodule gitlink diffs where every hunk is a bare `Subproject commit X..Y`
  line and the submodule itself has no uncommitted content - the tracking
  branch moved since the worktree was created, not real work.
- Known local-only files: dev-proxy overrides, the gitignored auth config
  copied in at setup, `.claude/launch.json`, telemetry directories.

Anything else uncommitted (real source edits, new files outside that list)
means STOP: flag it, don't recommend removal, even if the branch is merged.
Merged-but-dirty usually means someone edited after the PR merged; that is the
user's call.

### 5. Not obviously merged - check for an open PR

A branch that is not an ancestor of any fetched base may still be in review.
Check the git host (Bitbucket, GitHub) for an open PR from that branch (CLI,
API or MCP - whichever is available).

- Open PR found: keep, report as "in review, PR #N", no removal command.
- No open PR and no merge found: report as "unclear - confirm with the user
  before removing". Never guess either way.

### 6. Report

One table: path | ticket/branch | merge target (or "none found") |
uncommitted notes | verdict (safe to remove / keep - in review / needs your
call).

For every "safe to remove" row, one ready-to-run block:

```bash
git worktree remove --force <path> && git branch -D <branch> && git push origin --delete <branch>
```

If the ticket also has same-named branches in submodules
(`git -C apps/<feature> branch -r | grep <branch>`), emit a separate block per
submodule:

```bash
git -C apps/<feature> push origin --delete <branch>
```

## Output format

The table from step 6, then the command blocks, then one line listing what
you deliberately did not recommend and why.

## Gotchas

- **Why report-only.** Bulk `git worktree remove --force` / `git branch -D` /
  `git push --delete` across several worktrees trips the auto-mode permission
  classifier even when every target is independently verified safe. The
  result is a loop of denied attempts. Presenting commands avoids it.
- `git worktree list` can show a path that no longer exists on disk; `git
  worktree prune` clears the record and is safe to recommend first.
- A worktree on a detached HEAD has no branch to check; report it as "needs
  your call" with its commit.
- The "known noise" file list drifts as setup scripts change. Re-verify it
  when a new local-only file starts showing up everywhere.

## Adapt to your repo

- `<integration-branch>` and the `release/*` pattern: your merge targets.
- Step 4's local-only file list: whatever your setup copies into a worktree.
- `apps/<feature>`: your submodule paths; delete the submodule block if none.
- Step 5: name the PR lookup you actually have (`gh pr list`, Bitbucket API, an MCP).

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
