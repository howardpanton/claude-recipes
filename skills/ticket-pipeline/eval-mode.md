# Ticket pipeline: eval mode (`--eval`)

Supporting file for the `ticket-pipeline` skill. Read it in full before any
`--eval` run; it overrides several rules in SKILL.md. The pattern itself,
benchmark set and rubrics live in `evals/README.md` at the library root.

Purpose: re-run the pipeline stages against a benchmark ticket whose good
outcome is already known, to detect regressions after a change to an agent
prompt, a skill, a hook, or model routing. The run must leave no trace
outside the local clone.

## Rules

- **No external writes, ever.** Skip tracker pickup, tracker status sync,
  applying the assessor's tracker edits, and push/PR/comments: everything
  in `side-effects.md`. The ticket snapshot (setup step 1) is a read and
  stays. The agents have no external tools, so nothing else needs switching
  off, but prepend `EVAL_MODE=1` to every stage prompt anyway so the
  handovers record the mode.
- **Isolated tree.** A dedicated worktree (same bootstrap as setup step 7)
  on a throwaway branch `eval/<TICKET>-<date>`; never the shared tree. Local
  commits by developer and tester are fine; nothing is pushed. Remove the
  worktree and branch after scoring.
- **Handovers** go to `HANDOVER_DIR=.claude/evals/runs/<date>-<TICKET>/`
  instead of `.claude/handovers/`; `00-state.md` gets `Mode: eval`. `runs/`
  is throwaway and git-ignored.
- **Stop after REVIEW.** The reviewer writes `04-review.md` with a verdict
  and the would-be PR artefacts; you do not push and do not open or update a
  PR. Skip the fix loop and the escalation cycle: a CHANGES-REQUESTED verdict
  is eval data, not something to repair. Skip the Finish step's
  keep-for-next-time question; it exists to record real work.
- **Finish (replaces the normal Finish).** Score each completed stage's
  handover against the per-stage rubrics in `evals/README.md`, pass or fail
  per rubric line, comparing to the benchmark's known-good outcome. Write
  the scorecard to `.claude/evals/results/<date>-<change-under-test>.md`
  (`results/` is committed history) and report regressions against the most
  recent prior scorecard for the same benchmark. A regression on a
  previously-passing line blocks the harness change.

## Scorecard shape

```markdown
# Eval: <TICKET> - <change under test> - <date>

Benchmark: <TICKET> (<profile>)   Prior scorecard: <file or "none">

| stage   | rubric line                              | result | note                     |
| ------- | ---------------------------------------- | ------ | ------------------------ |
| assess  | Pipeline flags present, Profile correct  | pass   |                          |
| plan    | Submodules in scope match the merged PR  | fail   | listed an extra package  |
| ...     |                                          |        |                          |

Regressions vs prior: <lines that were pass and are now fail, or "none">
```
