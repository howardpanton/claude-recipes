# Harness evals: the ticket-pipeline benchmark set

A regression suite for the **harness itself** (agents, skills, hooks, model
routing), not the product. Re-run whenever an agent prompt, a pipeline skill
or a repo gate changes, and compare against the last recorded scorecard.

The bar is the eval, not the demo. A one-off dry run proves a prompt change
can work once; this set proves it still works on known ground truth.

## Benchmark tickets

Past tickets whose outcome a human approved and merged. Ground truth is that
merged outcome: which repos the PR touched, the human review verdict, the
flags the assessor should have set. Choose tickets that span the shapes the
pipeline routes differently. Example set:

| #   | Ticket   | Shape              | Why it is in the set                                                                          |
| --- | -------- | ------------------ | --------------------------------------------------------------------------------------------- |
| 1   | PROJ-101 | story (UI)         | Multi-step dialog, design reference, `User-facing flows: yes`; probes the design gate and E2E |
| 2   | PROJ-102 | bug, red base      | Tests the failing-repro-first rule; a known test-setup gotcha in the touched package          |
| 3   | PROJ-103 | coverage           | Coverage fast-path routing; the original run surfaced a real source bug, a finder-quality probe |
| 4   | PROJ-104 | flake fix          | Small and sharply scoped; probes whether the pipeline over-builds                             |
| 5   | PROJ-105 | task               | Measurable before/after, no user story demanded, "no behaviour change" honoured               |
| 6   | PROJ-106 | spike              | Write-up bar instead of code gates; coverage gate off for throwaway code                      |

Confirm the set with the team before the first run; keep it to six to eight
tickets so a full pass stays affordable.

## How to run

```
/ticket-pipeline <BENCHMARK-TICKET> --eval
```

The `--eval` switch (defined in the `ticket-pipeline` skill's `eval-mode.md`):

- runs in a fresh worktree on a throwaway `eval/<TICKET>-<date>` branch;
- switches off the orchestrator's own external side effects (the stage
  agents have none by design: the orchestrator owns tracker, push and PR);
- writes handovers to `.claude/evals/runs/<date>-<ticket>/`;
- stops after `04-review.md`: no push, no PR, no fix loop;
- scores the run against the rubrics below into
  `.claude/evals/results/<date>-<change-under-test>.md`.

`runs/` is throwaway and git-ignored. `results/` is the history and is
committed.

**A regression on any previously-passing rubric line blocks the harness
change**, the same way a failing unit test blocks a code change.

## Per-stage rubrics (pass or fail each line)

**assess**

- `## Pipeline flags` present; `Profile`, `Pipelineable` and
  `Design reference` correct for the ticket.
- Ticket-quality findings match the substance of the original human-approved
  assessment.

**plan**

- "Submodules in scope" names exactly the repos the merged PR touched: none
  missing, none extra.
- Every AC mapped to concrete files.

**develop**

- Commits land in the correct repo(s); branch named `feature/<TICKET>-*`.
- No unintended submodule pointer staged.
- Bug profile: `## Bug-repro evidence` shows the spec failing before the fix.

**test**

- Pre-push gate clears: sibling specs, `<coverage-threshold>` on the touched
  project (worked example 80/80/80/80), lint.
- No spec padding: tests assert real behaviour, not existence; the
  spot-checked-to-fail list is non-empty.

**review**

- Verdict matches the human outcome of the original PR
  (APPROVE / APPROVE-WITH-NITS / CHANGES-REQUESTED).
- Seeded-defect probe: when the run under test plants a known defect, the
  reviewer flags it.

## Scoring

The orchestrator scores inline at the end of the eval run, one line per
rubric item, and writes the scorecard (shape in `eval-mode.md`). Judgement
lines ("findings match the substance") are scored by reading the two
documents side by side; keep the ground-truth assessment next to the
benchmark ticket so the comparison is mechanical.

## Not yet built

- Scorecard trend file across runs (one JSON row per run, like a coverage
  history file).
- Skill-triggering accuracy checks: does the right skill fire for a given
  prompt?
- Automated LM-judge scoring for the judgement rubric lines.

## Adapt to your repo

- Replace the example ticket rows with six to eight of your own merged
  tickets, one per profile you route.
- Store each ticket's ground truth (merged PR touched-paths, human verdict,
  approved assessment) beside this file so scoring needs no tracker access.
- `<coverage-threshold>`: your gate's number.
- Git-ignore `.claude/evals/runs/`; commit `.claude/evals/results/`.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
