# Lessons

Hard-won lessons distilled from a persistent-memory directory built up over months of
daily agent-assisted work on a large monorepo with a ticket tracker, a git host and CI.
Each lesson kept here transfers to another team, repo or toolchain; the notes that only
described where something stood on a given day were dropped.

## Files

- [git-and-submodules.md](git-and-submodules.md) — submodule pointers, release branches, PR landing order, worktrees, push gates
- [ci-pipelines.md](ci-pipelines.md) — pipeline Groovy runtime traps, dispatch semantics, aborts and gates, executors, deploy and promotion state
- [claude-code-tooling.md](claude-code-tooling.md) — interrupted calls, hooks and mods, permission classifiers, shell quirks, MCP and artifact editing, browser automation
- [testing-and-coverage.md](testing-and-coverage.md) — mutation testing, text contracts, evidence, coverage gates, local E2E, Jest, Angular and Sentry traps
- [process-and-estimation.md](process-and-estimation.md) — estimation rubric, PR quality signals, release mechanics, unattended sprints, dependency audits, cloud permissions, analytics evidence

## Entry format

Every entry follows the same shape, one to three lines per field:

```markdown
**Title of the lesson**

**Symptom:** what you see first: the error text, the wrong result, the green badge that lied.
**Cause:** the mechanism, in one breath.
**Rule:** what to do next time, with the command or the check where one exists.
```

No dates, ticket keys, commit hashes, hosts or people: the lesson, not the event. `PROJ-123`
is the example ticket key and `<integration-branch>` is develop or main.

## Adding one

A lesson graduates here from a memory file (see [../memory/README.md](../memory/README.md))
when it has been true for more than one ticket and would still be true in another repo.
Strip the identifiers, keep the mechanism, put it in the file whose list above fits, and
add nothing that the repo's own docs already say.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
