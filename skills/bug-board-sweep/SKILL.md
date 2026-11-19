---
name: bug-board-sweep
description: Use when the user says "sweep the bug board", "pick up the next bug" or "run the bug sweep", or when a timed run invokes it. Follows up open sweep PRs, then selects the next AI-eligible bug, checks it is still relevant, assesses it for outcome, repro steps, acceptance criteria and business value, and drives it through the ticket pipeline to an open PR, announcing each step in the team chat.
disable-model-invocation: true
---

# Bug board sweep

## Overview

You are the **sweep controller**. One run takes at most one ticket to a PR, or parks it.
The timer re-runs you; you never loop over tickets inside a run. Everything heavy is
delegated to `ticket-pipeline`; this recipe only selects, gates and announces. A bug
that is stale, out of reach or unclear is cheaper to park with a visible reason than to
build wrongly.

## When to use

- A labelled queue of bugs exists that the team has agreed an agent may attempt.
- A recurring run should work that queue unattended and report in `<chat-tool>`.

Not for stories or features (run `ticket-pipeline` directly), for tickets without the
eligibility label, or for merging anything.

## Arguments

- `--dry-run`: select and report the candidate; no tracker, chat or git writes.
- `--ticket=<KEY>`: skip selection and sweep this ticket. It must still carry the label.

## Constants

| Name | Value |
| --- | --- |
| Queue | `<bug-filter>`, the saved filter behind the bug board |
| Chat channel | `<sweep-channel>` |
| Base and PR target | the current release train (see [release-train.md](release-train.md)); never `<integration-branch>` |
| Eligible label | `ai-eligible` |
| Park labels | `ai-needs-clarity`, `ai-stale`, `ai-needs-human` |

Message templates are in [chat-messages.md](chat-messages.md). The first message for a
ticket is top-level; every later update is a thread reply on it (keep the message id).
Never mention individuals; mention the channel only in the clarity message.

Resolve the release train once per run, before Step 1, using
[release-train.md](release-train.md), and record it in every `00-state.md` as `Base:`.

## Step 0 - Follow up open PRs (before any new ticket)

Follow-ups outrank new work. For every `<handover-dir>/<KEY>/00-state.md` with a `PR:`
line:

1. **State.** Read the PR. Merged or declined: post `closed` in the ticket's thread,
   comment on the ticket, mark the handover `PR: <url> (merged|declined)` so it is
   skipped next time, and note the worktree as removable. Open: continue.
2. **New comments.** Keep only comments newer than `Last follow-up:` in `00-state.md`
   (absent means all), and ignore the sweep's own posts.
3. **Triage each comment.**
   - **Change request**: run the pipeline's fix loop exactly as for a changes-requested
     verdict (`ticket-developer` with the comments as the work list, then
     `ticket-tester`, then `ticket-reviewer` updating the same PR). Reply on the thread
     with what changed and the commit; re-run Step 4b if the change is observable in a
     browser.
   - **Question**: answer on the thread from the handovers and the code. Never guess; if
     the answer needs a decision, treat it as ambiguous.
   - **Ambiguous or needs a decision**: post `needs-clarity` in the ticket's thread
     quoting the comment, add `ai-needs-clarity`, leave the PR as it is.
   - **Approval, or a nit the author calls optional**: reply only if a reply is expected.
4. **Re-read the PR state immediately before any push.** A PR merged since step 1 has
   had its branch deleted, and a push recreates it as a stray branch. For a merged PR,
   carry the fix into another open PR that already touches the file, or a new branch off
   the train, and say so on the review thread.
5. Record `Last follow-up: <ISO timestamp>` in `00-state.md`.
6. One PR can consume the whole run. If it does, stop; the next run starts at Step 1.

## Step 1 - Select

**Jira:**

```
filter = <bug-filter> AND issuetype = Bug
  AND labels = "ai-eligible"
  AND labels not in ("ai-needs-clarity", "ai-stale", "ai-needs-human")
  AND status in (<to-do statuses>)
  AND assignee is EMPTY
ORDER BY priority DESC, created ASC
```

**GitHub:** open issues labelled `bug` and `ai-eligible`, none of the park labels, no
assignee, oldest first within priority.

Skip any result whose `00-state.md` shows an incomplete stage: a run is in flight or
halted, so report it instead of starting another. Take the first remaining ticket. None
left: post nothing, print "queue empty", stop.

## Step 2 - Relevance check (before touching the tracker or chat)

Read the ticket. Then, read-only:

1. Search the codebase for the component, service or string it names. Confirm the code
   path still exists and still behaves as described.
2. `git log --since=<ticket created> --grep=<KEY>`, and check PRs linked on the ticket.
3. Decide whether it is a code bug at all. Pipeline, infrastructure, a broad "improve
   the UX" request or an investigation is out of the pipeline's reach.

| Finding | Action |
| --- | --- |
| Already fixed, or code path gone | Comment with the evidence (commit or file), add `ai-stale`, post `stale`, stop |
| Not an application-code bug | Add `ai-needs-human`, post `needs-human`, stop |
| Still relevant | Continue |

## Step 3 - Assess

Post `assessing`. Run **only the ASSESS stage** of the pipeline. If `ticket-pipeline`
cannot be invoked as a skill (it is user-invoked only), read its `SKILL.md` and act as
its orchestrator yourself, exactly as if the user had typed:

```
/ticket-pipeline <KEY> --base=<train> --from=assess
```

Stop once `00-assess.md` exists; do not advance to PLAN. The assessor has applied the
`assess-ticket` rubric and proposed or made the ticket edits. Post `updated` with the
before and after summary from the handover.

**Gate: the ticket must have all four**, as judged by the handover:

1. a clear expected outcome,
2. steps to reproduce,
3. testable acceptance criteria,
4. a stated business value or impact.

Ready with all four: Step 4. Otherwise: Step 5.

## Step 4 - Build

Post `starting`. Resume the pipeline unattended, again as its orchestrator:

```
/ticket-pipeline <KEY> --base=<train> --auto --from=plan
```

The pipeline owns the worktree, the reproduce-the-bug-first rule, commits, pushes, the
PR targeting `<train>` and the ticket transitions. Do not duplicate any of it here.

| Result | Chat |
| --- | --- |
| PR open, any verdict | `pr-ready` with PR URL, verdict and the coverage line from `04-review.md` |
| Halted (failed stage, exhausted fix loop) | `halted` with stage and reason; leave the pipeline's own ticket comment |

Two gates wrap the build; both are in [build-gates.md](build-gates.md) and neither is
optional:

- **Step 4a - E2E gate**, decided before DEVELOP and enforced before the PR opens: name
  the E2E domains the change can affect, and treat any failure not proven pre-existing
  by a control run on the unmodified base as blocking.
- **Step 4b - Browser verification**, after the PR is open: a before and after pair for
  every acceptance criterion observable in a browser, using `browser-qa`. A pair that
  does not show the fix reopens the fix loop.

Stop. One ticket per run.

## Step 5 - Park for clarity

Write the questions as a numbered list: concrete, answerable, one line each. Then:

1. Comment on the ticket with the questions.
2. Add `ai-needs-clarity`.
3. **Undo the pipeline pickup** so Step 1 can re-select it later: if ASSESS moved the
   ticket to in-progress or assigned the runner, move it back and clear the assignee.
4. Post `needs-clarity` with the same questions.
5. Leave the handover directory in place; the assessment is reused on the retry.

A human answers on the ticket and removes the label; the next run re-selects it. If an
unattended build halts because the work is ambiguous, treat that as Step 5 too. Do not
guess.

## Running on a timer

Run a few times through the working day (for example cron `3 9,12,15 * * 1-5`), from
either a hosted recurring routine or an in-session cron that needs re-arming when it
expires. Never arm both. Before relying on a new timer, do one `--dry-run` from it and
confirm it can reach the tracker, the chat tool, `<git-host>` and the repository.

## Hard rules

- Never merge. Never transition a ticket to a done, released or QA status.
- Never open or retarget a PR to `<integration-branch>`, the production branch or a
  frozen release branch. Read back the destination after creating the PR.
- Never pick a ticket without `ai-eligible`, whatever the arguments say.
- One ticket per run; never two pipelines at once.
- Tracker and chat writes are best-effort: a failed post is logged in `00-state.md` and
  never blocks the build, but a failed **clarity** post must still leave the label.
- `--dry-run` writes nothing anywhere, including labels.
- If an agent reports it had no tracker or `<git-host>` tools, do its external writes
  yourself from its handover (the proposed ticket edits, the PR title and body, the
  verdict comment) rather than re-running it.

## Adapt to your repo

- `<bug-filter>` and the to-do statuses in the Step 1 query; `<sweep-channel>`.
- Label names, if `ai-eligible` and the three park labels clash with yours.
- Release-train convention in [release-train.md](release-train.md); if you have no
  trains, set the base to the branch bug fixes target and delete that file's script.
- `<handover-dir>` (the pipeline default is `.claude/handovers`) and the pipeline flags;
  re-check `--from`, `--auto` and `--base` still exist in `ticket-pipeline`.
- `<e2e-cmd>` and whether `<ci>` runs E2E on branches; delete Step 4a's premise if it does.
- Preview-environment URL pattern and local run command for Step 4b.
- Timer mechanism and times; the ticket link format in the chat templates.
