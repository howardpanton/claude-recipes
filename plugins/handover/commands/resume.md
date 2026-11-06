---
description: Resume from a handover document - verify its claims against the repo before acting on any of them
argument-hint: '[optional path to a handover doc; defaults to the most recent]'
allowed-tools: Bash, Read, Glob, Grep
---

Pick up work from a handover document.

## Find it

If `$ARGUMENTS` names a file, use it. Otherwise take the most recent by filename from
`docs/handover/`:

```bash
ls -1 docs/handover/*.md 2>/dev/null | sort | tail -3
```

Show the user which one you picked and its date. If there is no handover directory, say so
and stop; do not guess at the state of the work.

## Read it fully

All of it, before doing anything. The Traps and Deliberate omissions sections are the ones
that prevent wasted work, and they are near the bottom.

## Then verify: this is the point of the command

**The document describes the past. The repository is the present.** Treat every claim as a
hypothesis until you have checked it.

Run the document's Verification block and compare against the results it records. Then
check for drift, in every repo the state-of-the-world table lists:

```bash
git rev-parse HEAD                      # same as the doc's front matter?
git log --oneline <doc-sha>..HEAD       # what landed since it was written?
git status --porcelain                  # uncommitted work in progress?
git ls-remote origin <branch>           # does the remote still match the recorded tip?
```

Re-check PR and ticket states the table records, with the host and tracker tools
available. Drift is normal and not a problem; silently acting on a stale document is.
Anything that has moved, you re-check yourself.

If a claim in Done does not hold up, say so plainly and treat that item as **not done**. A
handover that has rotted is still useful as a map; it is dangerous as a source of truth.

## Report before acting

Give the user a short orientation:

- Which document, and how old it is
- What the verification found: matches, and specifically what drifted
- The single next action the document names, and whether it still makes sense given the
  drift
- Blocking open questions, quoted

Then stop and let the user steer. Do not begin work off the back of a handover unless they
say so or the document records an explicit instruction to continue; the state may have
changed for reasons the document could not know about.

## Carry it forward

Decisions and user preferences in the document remain in force. Do not re-litigate a
settled decision or overturn a user's call because the reasoning is not obvious to you
now; if you think one is wrong, say so and ask, rather than quietly doing something
different.

Deliberate omissions stay omitted. Do not "fix" them.
