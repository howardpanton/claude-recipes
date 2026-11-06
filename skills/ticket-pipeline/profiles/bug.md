# Profile: bug

Applies to: issue type `Bug`. Override: a Bug that asks for new behaviour
rather than restoring intended behaviour -> `story`, with the reason recorded
under `## Pipeline flags`.

## Stages

| Stage   | Runs | What differs for this profile                                                                                  |
| ------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| ASSESS  | yes  | Rubric below. No user story required.                                                                          |
| PLAN    | yes  | The plan names the root cause and every caller of the code being fixed: fix once, where all callers route through. |
| DEVELOP | yes  | Failing-repro-first rule below, before any production edit.                                                    |
| TEST    | yes  | Verifies the repro evidence exists; back-fills it if the developer did not.                                    |
| REVIEW  | yes  | Repro evidence is a Critical gate.                                                                             |

## Assess rubric

Ready only when all hold (Bugs keep the summary-first format):

- Steps to reproduce, with the data or environment needed.
- Expected vs actual behaviour, one sentence each.
- Where it was seen: environment, build id or version, page, browser.
- Severity and user impact.
- No user story required.

## Definition of done

**Failing-repro-first.** Before touching production code, the developer
writes a regression spec that reproduces the bug, runs it, and confirms it
fails on the unfixed code for the expected reason (the bug, not a typo in
the spec). The command and the actual failing output go into
`02-implementation.md` under `## Bug-repro evidence`. Only then is the fix
implemented, and the same spec watched going green. A spec that passes
before the fix is testing the wrong thing; rewrite it until it reproduces the
failure.

**Tester back-fill.** If `## Bug-repro evidence` is missing, the tester
writes the regression spec, restores the pre-fix state of the touched files
with `git checkout <BASE_BRANCH> -- <file>` (the fix is already committed, so
stash does not help), runs the spec, records the red output in
`03-tests.md`, then restores with `git checkout HEAD -- <file>` and confirms
`git status` shows no production-file changes.

Plus the story profile's gates: sibling specs, `<coverage-threshold>`
(worked example 80% on all four metrics), `<lint-cmd>` clean.

## Reviewer evidence

| Evidence                                                                          | Where                                              | Missing =                                              |
| --------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `## Bug-repro evidence`: regression spec plus output showing it failed before the fix | `02-implementation.md`, or back-filled in `03-tests.md` | Critical: a spec that only ever passed proves nothing about the fix |
| Coverage numbers and lint result                                                  | `03-tests.md`                                      | Critical                                               |
| Fix sits where all callers route through, not in one caller                       | diff                                               | Major                                             |

## Not pipelineable

Never for a repository defect. A "bug" in a deployed environment with no
repo change (config, data, infrastructure) -> `Pipelineable: no - <reason>`.
