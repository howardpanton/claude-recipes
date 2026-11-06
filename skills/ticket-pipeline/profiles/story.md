# Profile: story

Applies to: issue type `Story`. Override: a Story that is really a defect
report (repro steps, no new behaviour) -> `bug`, with the reason recorded
under `## Pipeline flags`.

## Stages

| Stage   | Runs | What differs for this profile                                                                                                                   |
| ------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ASSESS  | yes  | Rubric below, including the design gate.                                                                                                        |
| PLAN    | yes  | `User-facing flows: yes` -> the states (loading, empty, error, disabled, permission denied, validation) and the copy go into the definition of done. `HANDOVER_DIR/design/` present -> write `## Design mapping`. |
| DEVELOP | yes  | The repo's standard code gates.                                                                                                                 |
| TEST    | yes  | Sibling specs, `<coverage-threshold>`; E2E when `User-facing flows: yes`.                                                                       |
| REVIEW  | yes  | Evidence below; UX review checklist on user-facing diffs.                                                                                       |

## Assess rubric

Ready only when all hold (the `assess-ticket` skill is the method):

- User story names who, what and why (As a / I want / so that), followed by
  a business-value section.
- Acceptance criteria are GIVEN/WHEN/THEN, testable, and cover the happy
  path, edge cases and failure states.
- NFRs considered where the change touches them: performance, security,
  accessibility, observability, i18n.
- Design gate: "design required" set, or a `needs-design`/`involves-ux`
  label -> a design link must exist somewhere in `ticket.md` (description,
  links, comments). None -> `Needs refinement - design missing`; the next
  action is to raise or link a design ticket. UI is not built before design.

## Definition of done

- Every AC implemented and mapped from `01-plan.md` into
  `02-implementation.md`.
- A sibling spec for every changed source file of the kinds the pre-push gate
  names; coverage at or above `<coverage-threshold>` on all four metrics for
  the touched project. Worked example: 80% statements, branches, functions
  and lines.
- `<lint-cmd>` clean on every changed file.
- A screenshot or snapshot showing the behaviour (dev server or mock server).
- `User-facing flows: yes` -> an E2E spec, or an explicit justified skip in
  `03-tests.md`.

## Reviewer evidence

| Evidence                                                   | Where                              | Missing =  |
| ---------------------------------------------------------- | ---------------------------------- | ---------- |
| Coverage numbers (not "tests pass")                        | `03-tests.md`                      | Critical   |
| Lint result                                                | `03-tests.md`                      | Critical   |
| Screenshot or snapshot of the behaviour                    | `02-implementation.md` or the PR   | Major |
| E2E spec or justified skip (`User-facing flows: yes`)      | `03-tests.md`                      | Critical   |
| UX checklist findings (user-facing diffs)                  | `04-review.md`                     | Major |
| Perf evidence when `Perf-relevant: yes`                    | `03-tests.md` -> `## Perf evidence` | Critical  |

## Not pipelineable

Never. A Story always carries code intent. A Story with no code change is
mis-typed: reclassify (design work -> `design`, investigation -> `spike`)
instead of stopping.
