# Profile: spike

Applies to: issue type `Spike`, and a `Task` whose summary starts with
`Spike:` (case-insensitive); the assessor overrides `task` -> `spike`.
Routing: "design required" set, or a `needs-design`/`involves-ux` label ->
`Profile: design` (a design spike; the orchestrator hands off to the design
skill).

## Stages

| Stage   | Runs | What differs for this profile                                                                  |
| ------- | ---- | ---------------------------------------------------------------------------------------------- |
| ASSESS  | yes  | Rubric below.                                                                                  |
| PLAN    | yes  | The plan is the experiment design: hypothesis, method, measurements, what decides the answer.  |
| DEVELOP | yes  | Builds the harness or runs the experiment; throwaway code labelled as such.                    |
| TEST    | yes  | Reproduces the method once. The coverage gate does not apply to throwaway code.                |
| REVIEW  | yes  | Reviews against the research bar below, not the code-shipping gates.                           |

## Assess rubric

Ready only when all hold:

- The question, stated so that an answer is recognisable.
- A hypothesis and what evidence would confirm or refute it.
- The method (what will be built, measured or read) and the scale it runs
  at.
- What decides the outcome: a threshold, a comparison, or a go/no-go rule.
- A time box.

## Definition of done

- A write-up: predicted vs measured numbers, a reproducible method
  (commands, fixtures, number of runs), honest limits.
- The deliverable is the write-up: a wiki page, a ticket comment, or a doc
  on a PR. Shipped product code is out of scope; harness code is labelled
  throwaway and kept out of production paths.
- A recommendation, and where the answer is "build it", a follow-up Story
  drafted with testable ACs and linked to the spike.
- Coverage gate off for throwaway code. `<lint-cmd>` still applies to
  anything committed.

## Reviewer evidence

| Evidence                                                              | Where    | Missing =  |
| --------------------------------------------------------------------- | -------- | ---------- |
| Stated hypothesis and predicted values                                | write-up | Critical   |
| Measured values with the number of runs and the command used          | write-up | Critical   |
| Reproducible method (another engineer could re-run it)                | write-up | Critical   |
| Honest limits and what was not tested                                 | write-up | Major |
| Follow-up Story drafted and linked when the answer is "build it"      | tracker  | Major |

## Not pipelineable

A spike that is reading, meetings or vendor calls with nothing to build or
measure -> `Pipelineable: no - <reason>`. A design spike -> `Profile: design`
(see Routing), never `Pipelineable: no`.
