# handover

Session handover documents for Claude Code, written for a machine reader.

```
/handover:create [slug]    write a handover for the next session
/handover:resume [path]    read the latest handover, verify it, report drift
```

Documents land in `docs/handover/YYYY-MM-DD-<slug>.md` in the repo you are working in.

## Why this exists

The default failure of a handover is not missing information. It is **confident, stale
information**. A new session reads "the tests pass", builds on it, and discovers three steps
later that they do not. The lost time is worse than if the handover had said nothing.

So the format is built around one constraint: *a claim without evidence is a liability*.
Every statement about the state of the world carries a commit SHA, a command with its
observed output, or an explicit unverified marker. `/handover:resume` re-runs the
verification block before trusting anything, and reports drift rather than assuming
continuity.

## What the format requires

Ten sections, all mandatory. An empty one says `None.` rather than disappearing, because a
missing heading is indistinguishable from an oversight.

Before writing, the command inventories every stateful thing the session touched (repos
including submodules, branches, PRs, tickets, CI jobs, environments, config stores) and
re-verifies each at write time. The three sections that carry the most weight, and are
most often skipped:

**Deliberate omissions.** Things that look like bugs but are intentional: empty config
values, skipped tests, copy that contradicts a design mock. Without this section the next
session helpfully "fixes" them.

**Traps.** Flaky suites, occupied ports, services that fail to start, misleading errors.
Recorded symptom-first, because the symptom is what the next session meets.

**Decisions, including what was rejected.** Stops settled questions being re-opened.
Decisions the user made are marked as theirs, so a later session does not quietly
overturn them.

## Constraints

- Written to `docs/handover/`; committed only when the user asks; never contains secrets,
  because it may be committed. Reference where a credential lives, never its value.
- Never overwrite an existing handover; suffix `-2`, `-3`. The history is worth more than
  tidiness.
- Gather ground truth by running commands, not from memory. A handover that hides a red
  build is worse than no handover.

## Install

See [../README.md](../README.md) for the local-marketplace install. In short:

```bash
claude plugin marketplace add /path/to/claude-recipes/plugins
claude plugin install handover@<marketplace-name>
```

Restart Claude Code, then `/handover:create`.
