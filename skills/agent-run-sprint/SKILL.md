---
name: agent-run-sprint
description: Use when an engineer will be away (days off, a workshop) and wants Claude Code agents to carry a sprint's worth of tickets with little supervision - "plan my sprint tickets so agents can do them while I'm out", "keep me updated on Slack", "agents should review but not approve", "set it up tonight so it runs tomorrow", "what can run without me", "what do I check when I'm back".
---

# Agent-run sprint

## Overview

One long-lived Claude Code session is the orchestrator: it plans, dispatches one background
subagent per task, verifies every result against live sources, relays the human's
decisions, and reports in one chat thread. Humans keep every merge, approval and live
action. Agent reports are claims, not facts. Checklists and tables are in
[verification.md](verification.md).

## When to use

- Several independent tickets, an engineer away for a day or more, and a human reachable
  by phone for decisions.

Not for one ticket end to end (the ticket pipeline), the end-of-day document (the
`handover` recipe, which this one calls each evening), or the code's own branch and gate
rules (change control; this recipe adds only the agent-specific rules).

## The loop

```
plan (tasks/plan.md + tasks/todo.md) -> smoke-test access -> schedule the checks ->
per phase: open a thread -> launch agents in parallel -> verify each result ->
relay decisions -> tick todo.md -> end of day: summary + handover
```

## 1. Plan with the human before they leave

1. Pull the tickets with all fields, comments and links. Save the raw result to the
   scratchpad and extract with `jq`. Read every description.
2. **Hunt for premise-breaking facts first.** Cheap read-only checks often shrink the
   critical path: a ticket's "access denied" premise may already be false, an AC may
   already be met in production.
3. **Eligibility.** A ticket can run unattended when it has clear ACs, no live mutation on
   its path, no cross-team ask, and a known prior-art location. Anything else is
   human-owned or split.
4. Write `tasks/plan.md`: dependency graph, schedule by day, hard rules (section 3), risks
   with a named fallback, open questions, the merge order. Write `tasks/todo.md`: an agent
   preamble plus one self-contained brief per task.
5. Be honest about the goal date: name the latest safe start for the critical chain and
   the fallback if it slips.
6. Ask the human only what blocks the plan: access, who to contact, which tracker
   transitions agents may use. Lead with the recommended option.

## 2. Set up the evening before

Run the smoke-test table in verification.md, then have one subagent repeat it. Keep the
session alive: do not exit it (scheduled jobs live only in it); keep the machine awake
(`caffeinate -ims` on macOS) and on mains power; ask the human to enable remote control so
they can reach the session from a phone.

**Scheduling.** Use the session's scheduler with off-minute times: a kickoff per day,
hourly thread checks during working hours, an end-of-day summary. When a phase is brought
forward, delete and replace that day's kickoff so it does not relaunch finished work.

## 3. Hard rules (in every brief)

- **No live mutations:** no CI triggers, cloud writes, aborts, or anything in production.
  Read-only GETs are fine. Anything live becomes a question to the human.
- **Review but never approve.** Agents self-review, post the verdict as a PR comment and
  move the ticket to review. Never merge, approve, `--no-verify` or force-push.
- **Never change a main checkout's branch.** Each agent works in its own worktree:
  `git -C <repo> worktree add <path> -b <branch> origin/<integration-branch>`.
- **Stage explicit paths** with `git -C <wt> add -- <paths>`; push with `git -C <wt> push`.
- **If a hook refuses the push, hand it to the human.** Build the commit (use
  `git commit-tree` with a temporary `GIT_INDEX_FILE` for pointer bumps) and give them a
  `git -C <repo> push origin <sha>:refs/heads/<branch>` line. Never route around a hook.
- **Commit before any mutation testing.** A checkout revert cannot restore an untracked
  file.
- **Scratch files go in a per-agent subfolder.** Parallel agents overwrote each other's
  scripts in a shared scratchpad.
- **A PR description names only its own ticket key**; merging can transition every key
  mentioned. **Read back the PR destination after creating it**; hosts have overridden it.
- **Evidence is quoted, timestamped console lines** pasted into the ticket; merged-branch
  build URLs die.
- Ticket keys go in code comments only, never in runtime log text.

## 4. The brief (agent preamble)

Each subagent prompt is the preamble, then that task's `todo.md` section verbatim, then
decisions already made. The preamble: read `tasks/plan.md`; the hard rules; the exact
worktree, branch and commit formats including attribution trailers; the tracker
transitions allowed; progress replies in the thread prefixed `<ID> ·` (start, PR link,
one line per blocking question, done); self-review with the PR review recipe, fix
findings, post the verdict, do not approve; return status, evidence, PR URL plus
destination, ticket status and open questions. Give each task concrete starting facts
(file:line, the design decision, known traps); agents handed the prior-art location
finish faster and take fewer wrong turns.

## 5. Verify every claim

Before ticking a task, run the claim table in verification.md: PR destination and tip
SHA, scoped diff with no stray gitlinks, tests re-run in a throwaway worktree, ASCII and
no secrets, no force-push, ticket status, gitlinks valid on the submodule remote. Never
verify inside an agent's worktree with `git checkout`; capture real exit codes.

## 6. Relaying decisions

Collect agent questions into one numbered list in the thread, each with a recommendation,
so the human can answer "1A 2A 3 yes" from a phone. Record every decision on the ticket
as a dated comment; never edit descriptions, because the tool replaces the whole
description. Relay to a running agent by messaging its id. Hourly checks post only on
change or when a question is waiting.

## 7. What only the human can do

Approve and merge, in the written merge order; trigger or abort CI runs and deploys;
cloud-console and SSO work; cross-team asks; pushes to protected branches.

## 8. Morning-after checklist

1. Read the thread end to end; answer the numbered questions first.
2. Run the claim table on every "done" before trusting it.
3. For each PR: destination, CI status, review comment posted, ticket in review.
4. Read the consoles of any build the merges triggered: secrets printed, regressions in
   dependent jobs. A fix is proven when the downstream chain succeeds, not when it merges.
5. Check each merged PR's ticket status and move it by hand.
6. Delete stale scheduled jobs; re-run the smoke tests if the session died.
7. Read the handover and re-verify it per the `handover` recipe before acting on it.

## Gotchas

- Watch the trigger events after a merge; a fix is proven when the downstream chain
  succeeds, not when it merges.
- Treat build logs as public: a hook must fail the build on a token-shaped string. Pass
  secrets by file or env, never by argument.
- Independent review agents catch real issues. Always run one.
- Decide the canary window before the run, not during; ask agents to question their own
  plan.
- A fresh worktree needs `node_modules` (symlink it) or lint "passes" with nothing to lint.
- An abort during a deploy's prepare stage can be swallowed and the deploy still applies.
- More in verification.md.

## Adapt to your repo

- `<integration-branch>`, worktree base path, commit format and attribution trailers.
- `<ci>` read URL pattern and auth (`~/.netrc`, token env var).
- `<ticket-tracker>` transition names agents may use, and the review status name.
- Chat tool and thread conventions; the human's reachable channel.
- Session scheduler commands available in your Claude Code build.
- The PR review recipe agents self-review with.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
