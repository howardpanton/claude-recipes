# Profile: task

Applies to: issue type `Task` (tech debt, maintenance, tooling, upgrades).
Overrides: summary starts with `Spike:` -> `spike`; a Task that fixes a
defect -> `bug`; the reason is recorded under `## Pipeline flags`.

## Stages

| Stage   | Runs | What differs for this profile                                                          |
| ------- | ---- | -------------------------------------------------------------------------------------- |
| ASSESS  | yes  | Rubric below. No user story required.                                                  |
| PLAN    | yes  | The plan names the measure and how to take it before and after.                        |
| DEVELOP | yes  | Takes the before measure first and records it in `02-implementation.md`.               |
| TEST    | yes  | Full affected suite green is the no-regression proof; takes the after measure.         |
| REVIEW  | yes  | Before/after evidence is a Critical gate.                                              |

## Assess rubric

Ready only when all hold (Tasks keep the summary-first format):

- The problem, in one paragraph: what is wrong or costly today.
- A measurable outcome: the number or state that will be different
  afterwards.
- A scope boundary: which repos and paths change, and which do not.
- A "no behaviour change" statement, or an explicit list of the behaviour
  that is allowed to change.
- No user story required.

## Definition of done

- The before and after measure recorded, same method both times. Name the
  kind: bundle size (stats output, budget report), lint error or warning
  count, dependency version, count of deprecated usages, build or test
  duration.
- Full affected unit suite green (`<test-cmd>` for every touched project):
  the no-regression proof. Existing E2E suites for touched domains green when
  behaviour could be affected.
- `<lint-cmd>` clean on every changed file.
- Sibling specs still required for any changed source file of the kinds the
  pre-push gate names.
- Any fact a skill cites that this task changes (a version, a path, a
  threshold) is updated in that skill in the same PR.

## Reviewer evidence

| Evidence                                                        | Where                                  | Missing =  |
| --------------------------------------------------------------- | -------------------------------------- | ---------- |
| Before and after measure, same method, actual output quoted     | `02-implementation.md` / `03-tests.md` | Critical   |
| Full affected suite result (counts, not "tests pass")           | `03-tests.md`                          | Critical   |
| Lint result                                                     | `03-tests.md`                          | Critical   |
| Behaviour-change list matches the ticket's statement            | diff vs ticket                         | Critical   |
| Skills updated for changed facts                                | diff                                   | Major |

## Not pipelineable

Ops work with no repository change: rollback drills, scheduled report runs,
tracker or wiki admin, environment toggles -> `Pipelineable: no - <reason>`.
The orchestrator stops after ASSESS, creates no worktree, and leaves any
existing worktree untouched.
