# Persistent memory: one fact per file

A memory directory that survives across Claude Code sessions. The index is injected into
every session; the files are opened on demand. This recipe is the discipline that kept a
directory of well over a hundred such files useful through months of daily use, and the
traps that made some of them useless.

## Overview

One fact per file, one index line per file, and three rules that do most of the work:
update instead of duplicating, delete what is proven wrong, and never save what the repo
already records.

## Layout

```
<memory-dir>/
  MEMORY.md                          # the index: one line per memory, no content
  worktree-node-modules-symlink.md
  push-guard-matches-command-text.md
  ...
```

Claude Code's auto-memory lives at `~/.claude/projects/<project-slug>/memory/`; its
`MEMORY.md` is loaded into the system prompt at session start. Everything else in the
directory costs nothing until a session reads it.

## The file contract

See [template.md](template.md). Every file has:

- frontmatter: `name` (equals the filename stem, kebab-case), `description` (one
  actionable sentence), `metadata.type` (`feedback`, `project` or `reference`; `user` for
  facts about the person, rarely)
- the fact itself, symptom first when it is a trap
- `**Why:**` one line: the class of incident, not the incident
- `**How to apply:**` what to do next time, as a command or a check where possible
- `Related: [[other-name]]` links; the name is the other file's frontmatter name

## The index line

```
- [Short title](file-name.md) — <hook: the one clause that decides whether to open the file>
```

No content in the index. The index has a size limit, and every byte of it is paid on every
turn of every session. When it grew past the limit, the detail that had crept into index
lines had to be moved back into the files. Keep hooks under about 120 characters.

## Three kinds that earn their keep

| Type | What it is | Must carry |
| --- | --- | --- |
| `feedback` | a correction from the user or a reviewer | its **why**: a rule with no reason gets argued with and re-broken |
| `project` | state the repo cannot tell you: a decision, what is still owed, where a thing stands | absolute dates (`2026-03-14`, never "yesterday") |
| `reference` | a pointer: where a thing lives that no repo file names, a recipe that took a day to find | the pointer or the commands, not a narrative |

## Rules

1. **Update, do not duplicate.** Grep the index and the filenames before writing. If a
   memory on the topic exists, edit it: add a dated correction line at the top, or rewrite
   it as the current truth. Two files on one topic diverge, and the next session reads the
   stale one.
2. **Delete memories proven wrong.** A disproved belief nobody will fall into again is
   deleted. A disproved belief that is a natural wrong inference stays, rewritten with
   `CORRECTED <date>:` first and the old version second, so the next reader meets the
   correction before the trap.
3. **Absolute dates.** Convert "today", "last week", "this sprint" at write time. A memory
   outlives the session that wrote it.
4. **Verify before recommending.** Before telling anyone to use a remembered file, flag,
   script, parameter or branch, check it still exists: `ls`, `git grep`, `git ls-remote`.
   Memory rots; the repo is the source of truth. A tracker status is not evidence either:
   a ticket marked Done is not proof the code landed; `git grep` the behaviour on the
   integration branch.
5. **Do not save what the repo or git history already records.** No ticket histories, PR
   numbers, diffs, commit hashes, or commands that are in a README. Save the mechanic, the
   trap, the decision and its why.
6. **One fact per file.** A file that accumulates `UPDATE:` paragraphs is a log. At the
   third update, rewrite it as the current truth and drop the history.
7. **No secrets.** No tokens, passwords, keys, account numbers.
8. **Prefer the owning skill for skill-shaped lessons.** If a lesson only matters inside one
   skill's workflow, append one line to that skill instead. It is loaded exactly when it is
   needed, and memory stays small.

## What a good one looks like

```markdown
---
name: worktree-node-modules-symlink
description: "Symlink the main checkout's node_modules into a fresh worktree to run Jest and ESLint without a full install; valid only while the lockfiles match"
metadata:
  type: feedback
---

A fresh `git worktree` has no `node_modules`, so tests and lint cannot run in it, and
waiting for a full install in every throwaway worktree is the main reason the evidence
step gets skipped.

    ln -s <main-checkout>/node_modules <worktree>/node_modules

**Why:** evidence-before-done needs real test and coverage output from the worktree.

**How to apply:** safe only while the worktree and the main checkout have a byte-identical
lockfile. If the branch changes `package.json` or the lockfile, do a real install, or the
symlink silently tests the wrong dependency tree. Check the main checkout is not stale
either: compare `node_modules/<framework>/package.json` with `package.json` first.

Related: [[local-e2e-alternate-port]]
```

Index line:

```
- [Worktree node_modules symlink](worktree-node-modules-symlink.md) — skip the install in throwaway worktrees; valid only while lockfiles match
```

## The memory-writer stage of an autonomous pipeline

When a ticket pipeline (assess -> plan -> develop -> test -> review) finishes, an optional
final stage, off by default, reads the run's handover files and decides what, if anything,
is worth keeping. The orchestrator runs it only when the run surfaced a cross-ticket
mechanic. The agent definition is [`agents/memory-writer.md`](../agents/memory-writer.md).

**What qualifies.** Only a reusable mechanic: a tooling quirk, an environment trap, a git or
submodule rule, a test pattern that proved necessary, a reviewer correction with its
reason. Candidates come from the implementation handover's deviations, the test handover's
gaps and the review handover's watch points. Ticket history (what changed, the PR, the
verdict) never qualifies: the tracker and the handovers already hold it. Most runs keep
nothing; that is the expected outcome, not a failure.

**The 30-second bar.** A reader must get three things from the first screen without
scrolling: does this apply to me, what is the rule, why. In practice: description under
200 characters, body under 40 lines, bullets not prose, symptom -> cause -> rule.

**What it writes.** One memory file per kept item in the memory directory that sessions
actually load, following the template; an edit to the existing file when the topic already
has one; one index line per new file, appended, never rewriting other lines; and a short
confirmation handover (`05-memory.md`) listing what was written, or `Nothing kept`.

**What it must not do.** Write a per-ticket summary into the repo. The first version of this
stage did exactly that (`.claude/memory/ticket-PROJ-123.md` plus a line appended to a
repo-side `MEMORY.md` on every PR) and was removed: nothing loaded the files, and the
shared index conflicted on every pair of concurrent PRs. The agent has no shell, git or
tracker tools, so it cannot commit, push or transition anything; the orchestrator owns
those side effects.

## Adapt to your repo

- `<memory-dir>`: the Claude Code auto-memory path for your project, or a directory your
  `CLAUDE.md` tells sessions to read
- The hook limit (120 characters) and the file limit (40 lines) are the numbers that
  worked; tighten them if your index is injected into every turn
- Handover filenames (`02-implementation.md`, `03-tests.md`, `04-review.md`,
  `05-memory.md`): match your pipeline's names
- If your pipeline keeps learnings in skills instead, replace the writer's "write a memory
  file" with "append one line to the owning skill" and keep the candidate rule unchanged

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
