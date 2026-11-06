---
description: Write a handover document for the next Claude session - evidence-backed, verifiable, no unsupported claims
argument-hint: '[optional short slug, e.g. "pricing-rebuild"]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

Write a handover document for the next Claude session.

The reader is **another Claude instance with none of your context**. It cannot see this
conversation, your reasoning, or anything you decided but did not write down. Assume it
will act on this document directly. Assume it will be wrong in exactly the places you were
vague.

## The one rule

**A claim without evidence is a liability.** A future session that trusts "the tests pass"
and finds they do not will waste more time than if you had written nothing. Every statement
about the state of the world gets either a commit SHA, a command plus the output you
actually observed, or an explicit `ASSUMED - not verified` marker.

Never write "should work", "appears to", or "I believe". Either you ran it and can quote the
result, or you mark it unverified.

## Before writing

First list every stateful thing this session touched: repos (including submodules and
sibling checkouts), branches, PRs, tickets, CI jobs, deployed environments, cloud
resources, config stores. Then re-check each one now, cheaply, and write from the output:

```bash
git log --oneline -20
git status --porcelain
git rev-parse HEAD
git branch --show-current
git ls-remote origin "$(git branch --show-current)"   # pushed state; repeat in every repo touched
git submodule status                                   # if the repo has submodules
```

PR state via the git host's CLI or MCP; ticket status via the tracker; external state (CI
runs, deployed versions, feature flags) stated as exactly what changed this session, with
"nothing changed" said explicitly. Note pre-existing local dirt not owned by this work so
the next session neither commits nor "fixes" it.

Re-run the build and any test command you intend to describe. Quote real output. If a
command fails, that failure goes in the document; a handover that hides a red build is
worse than no handover.

## Where it goes

`docs/handover/YYYY-MM-DD-<slug>.md`, relative to the repository root. Use `$ARGUMENTS` as
the slug if given; otherwise derive a short kebab-case slug from the dominant theme of the
session. Create the directory if needed. Never overwrite an existing handover; if the path
is taken, append `-2`, `-3`, and so on. The history is worth more than tidiness.

## Required sections

Write all of them. If a section is genuinely empty, say `None.`; do not delete the heading,
because its absence is indistinguishable from an oversight.

### 1. Front matter and state of the world
Date, branch, repo path, `HEAD` SHA at time of writing, and the first commit of this
session's work. The SHA is the staleness contract: the next session diffs against it to
detect drift. Then a table, one row per stateful thing from the inventory above: branch
tip and whether it is pushed, PR state and reviews, ticket status, external systems,
working tree. Mark each row "verified <date>".

### 2. Orientation
Three sentences, maximum. What is this work, and what state is it in? Written for someone
who has never seen the project. No jargon that is not defined elsewhere in the document.

### 3. Done
One row per completed item. Each carries evidence:

| What | Evidence |
|---|---|
| Concrete outcome, past tense | `abc1234`, or a command and the output you observed |

Do not list activity. List outcomes. "Investigated the drawer widths" is not an outcome;
"seven drawers changed from fixed 600px to `min(600px, 100vw)`, `abc1234`" is.

### 4. Not done
Ordered by what should happen first. The top entry must be a **single concrete action** (a
file to open, a command to run, a question to ask), not a theme. Include any counts, log
strings or invariants the next session should assert against, and known quirks so its
checks do not false-fail.

### 5. Decisions
Every non-obvious choice, its rationale, and **what was rejected**. This section exists to
stop the next session re-opening settled questions, so the rejected option matters as much
as the chosen one. Include decisions the user made, marked as theirs; a future session must
not quietly overturn a user's call. Restate the standing constraints that bind this work
(from the project rules, the spec, or review decisions) so they survive even if the next
session skips the source docs.

### 6. Deliberate omissions
Things that look like bugs, gaps or sloppiness but are intentional. This is the
highest-value section and the one most often skipped. Empty config values, stubbed
functions, skipped tests, copy that contradicts a design mock: if a reasonable engineer
would "fix" it on sight, it belongs here with the reason it must stay.

### 7. Traps
Anything that cost you time and will cost the next session time: flaky suites, occupied
ports, services that fail to start, misleading error messages, commands that must run in a
specific order, tooling that lies, steps that need a human. Include the symptom, not just
the cause; the next session will meet the symptom first.

### 8. Pointers
Files with line numbers in `path/to/file.ts:42` form, URLs, backup paths, artifact links,
ticket keys, PR numbers. Where a build URL is cited as evidence, paste the relevant excerpt
too; merged-branch build URLs stop resolving. Prefer a precise pointer over a description
of where something roughly lives.

### 9. Open questions
Split into **blocking** (work cannot proceed correctly without an answer) and
**non-blocking** (a sensible default exists; state the default). If the user already
answered something, it is a decision, not an open question.

### 10. Verification
A copy-pasteable block that re-establishes ground truth in one run, with the result you
observed beside each command. The next session runs this **before** trusting anything
above.

````
```bash
git rev-parse HEAD            # expect <sha>
git ls-remote origin <branch> # expect <sha>
<build-cmd>                   # observed: clean
<test-cmd> --testFile=<path>  # observed: 5 passed
```
````

## Constraints

- **No secrets.** Written to `docs/handover/`; committed only when the user asks; never
  contains secrets, because it may be committed. No tokens, keys, or credentials, even
  redacted-looking ones. Reference the location of a credential, never its value.
- **User preferences carry forward.** If the user corrected your approach, stated a
  standard, or showed a working style, record it. Losing that means the next session
  repeats the mistake that earned the correction.
- **If a prior handover's assumption proved wrong this session**, say so in the new one.
  That is exactly the class of error handovers exist to prevent.
- **Length follows substance.** Long enough to transfer the state, short enough to be read
  in full. A padded document gets skimmed, and skimming is how the trap section gets
  missed.
- **Write prose, not telegrams.** The reader needs the reasoning, not just the conclusion.

When the document is written, tell the user its path and, in one line each, the blocking
open questions. Do not commit it unless the user asks.
