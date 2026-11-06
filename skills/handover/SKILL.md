---
name: handover
description: Use when a session is ending and the next one must pick up the work - "write a handover", "create a handover doc", "wrap up the session", "prepare for tomorrow's session" - when an agent-run day closes, or when resuming from an earlier handover and deciding what in it can still be trusted.
---

# Handover

## Overview

A claim without evidence is a liability. The default failure of a handover is not missing
information but confident, stale information: a new session reads "the tests pass", builds
on it, and discovers three steps later that they do not. So every statement about the
state of the world carries a commit SHA, a command with its observed output, or an
explicit `ASSUMED - not verified` marker, and resuming verifies before it trusts.

## When to use

- Ending any session that touched more than one stateful thing.
- The end of each day of an `agent-run-sprint`.
- Resuming: before acting on any claim in an earlier handover.

Not for durable evidence (that goes on the ticket) or reusable cross-ticket mechanics (save
those to persistent memory; handovers are per topic and are not re-read later). A
ready-to-install plugin with `/handover:create` and `/handover:resume` lives in
`plugins/handover/`.

## Where it goes

`docs/handover/YYYY-MM-DD-<slug>.md`, relative to the repo root. Never overwrite an existing
handover; suffix `-2`, `-3`. If you keep a progress ledger, append a session-end line
naming the file.

## Before writing: inventory, then re-verify

First list every stateful thing this session touched: repos (including submodules and
sibling checkouts), branches, PRs, tickets, CI jobs, deployed environments, cloud
resources, config stores. Then re-check each one at write time, cheaply, and write from the
output, not from memory:

```bash
git rev-parse HEAD; git branch --show-current; git status --porcelain
git log --oneline -1 <branch>; git ls-remote origin <branch>     # in EVERY repo touched
git submodule status                                              # pointer drift
```

PR state via the host's CLI or MCP; ticket status via the tracker; external state (CI
runs, deployed versions, flags) stated as exactly what changed this session, and "nothing
changed" said explicitly. Note pre-existing local dirt not owned by this work so the next
session neither commits nor "fixes" it. Re-run the build and test commands you intend to
describe and quote the real output; a handover that hides a red build is worse than none.

## Output format: ten sections, all mandatory

An empty section says `None.`; a missing heading is indistinguishable from an oversight.

1. **Front matter and state of the world.** Date, branch, repo path, `HEAD` SHA (the
   staleness contract the next session diffs against), first commit of this session's
   work, and a table of verified facts per stateful thing: branch tips and pushed state,
   PR state and reviews, ticket status, external systems, working tree. Mark each
   "verified <date>".
2. **Orientation.** Three sentences: what the work is and what state it is in, for someone
   who has never seen the project.
3. **Done.** One row per outcome, past tense, with evidence: a SHA, or a command and its
   observed output. Not activity ("investigated widths") but outcomes ("seven drawers
   changed to `min(600px, 100vw)`, `abc1234`").
4. **Not done.** Ordered. The top entry is a single concrete action (a file to open, a
   command to run, a question to ask); include counts, log strings or invariants the next
   session should assert against, and known quirks so its checks do not false-fail.
5. **Decisions, including what was rejected.** Every non-obvious choice, its rationale and
   the rejected option. Decisions the user made are marked as theirs; a later session must
   not quietly overturn them. Restate the standing constraints (from the project rules,
   the spec, review decisions) so they survive if the source docs are skipped.
6. **Deliberate omissions.** Things that look like bugs but are intentional: empty config
   values, stubbed functions, skipped tests, copy that contradicts a mock. The highest-value
   section and the one most often skipped; without it the next session "fixes" them.
7. **Traps.** Anything that cost time and will again: flaky suites, occupied ports,
   services that fail to start, misleading errors, order-dependent commands, tooling that
   lies, steps that need a human. Symptom first, because the symptom is what the next
   session meets.
8. **Pointers.** `path/to/file.ts:42`, URLs, ticket keys, PR numbers, build URLs cited as
   evidence (paste the excerpt too; merged-branch build URLs die), spec and plan paths.
9. **Open questions.** Blocking (work cannot proceed correctly) and non-blocking (a
   sensible default exists; state it). Something the user already answered is a decision,
   not a question.
10. **Verification.** A copy-pasteable block that re-establishes ground truth in one run,
    each command with the result you observed. The next session runs it before trusting
    anything above.

```bash
git rev-parse HEAD            # expect <sha>
git ls-remote origin <branch> # expect <sha>
<test-cmd> <project>          # observed: 42 passed, coverage 84%
```

## Resuming

The document describes the past; the repository is the present. Read all of it (Traps and
Deliberate omissions are near the bottom and are what prevent wasted work). Run its
Verification block and compare. Then check drift: `git log --oneline <doc-sha>..HEAD`,
`git status --porcelain`, the PR and ticket states. Drift is normal; silently acting on a
stale document is not. A Done claim that does not hold is treated as not done. Report
before acting: which document and how old, what matched and what drifted, the single next
action and whether it still makes sense, blocking questions quoted. Then let the user
steer. Decisions and user preferences remain in force; deliberate omissions stay omitted.
If a prior handover's assumption proved wrong this session, say so in the new one.

## Gotchas

- Written to `docs/handover/`; committed only when the user asks; never contains secrets,
  because it may be committed. No secrets even redacted-looking ones; reference where a
  credential lives, never its value.
- Length follows substance. A padded document gets skimmed, and skimming is how Traps gets
  missed. Prose, not telegrams; the reader needs the reasoning.
- "Should work", "appears to", "I believe" are banned phrases. Ran it and can quote it, or
  mark it unverified.
- User corrections and working style carry forward; losing them repeats the mistake that
  earned the correction.

## Adapt to your repo

- Where handovers live (`docs/handover/`) and whether that directory is git-ignored.
- The ledger file to append a session-end line to, if you keep one.
- `<test-cmd>` and the build command quoted in the Verification block.
- Which host and tracker tools verify PR and ticket state.
- Delete the submodule line if your repo has none.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
