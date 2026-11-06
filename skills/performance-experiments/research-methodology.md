# Research methodology

Reference for the `performance-experiments` recipe. Read it when running a spike, benchmark,
load test or A/B comparison; when asked "is this actually faster?", "how many runs are
enough?", "should I merge my spike branch?"; when writing up findings; or when proposing a
threshold for ratification.

The evidence bar in one sentence: **a hypothesis must predict numbers before the harness
runs, or it is not testable.**

Not for day-to-day debugging (debugging seeks a cause; research seeks a decision) or for
the evidence a normal code change needs before push (that is verification, not research).

## 1. The core loop

```
written hypothesis (with predicted numbers)
        -> reproducible harness
        -> measure
        -> compare prediction vs actual
        -> decide: adopt / reject / refine
        -> record the result where doctrine lives
```

| Step | Done looks like | Common failure |
| --- | --- | --- |
| 1. Hypothesise | One sentence plus a numeric prediction ("virtualising the list cuts the 1,000-row poll-cycle long task from ~430 ms to under 100 ms"), written before touching code, in [research-template.md](research-template.md) | "Let's see if it's faster": no number, so any outcome can be spun as success |
| 2. Build the harness | Anyone re-runs it from repo root with copy-pasteable commands | One-off clicking in a personal environment; the result dies with the session |
| 3. Measure | Raw numbers per run, at least 5 runs, p75/p95 recorded | A single run, an eyeballed DevTools panel, a screenshot |
| 4. Compare | Actual vs predicted side by side | Actuals reported with the prediction quietly dropped |
| 5. Decide | An explicit verdict: adopt, reject (record why so it is findable), or refine (new hypothesis, new prediction) | "Interesting, we should look at this more" |
| 6. Record | Write-up filed; spike branch dies | Findings live only in the branch, chat, or someone's head |

**The prediction rule.** The prediction was written when you did not know the answer, so it
cannot be retro-fitted. If you genuinely cannot predict a number, your first experiment is a
baseline measurement; label it as such, and its output is what the real hypothesis predicts
against.

## 2. Reproducibility requirements

| Requirement | How |
| --- | --- |
| Deterministic data | The mock server's seeded PRNG; record the seed and pin it explicitly for cross-machine runs |
| Fixed scale | The pre-built scale configs, named in the write-up; never hand-tuned data |
| Timing caveat | Data is deterministic, latency is not: pin jitter to 0 for strict comparisons, or rely on run counts and percentiles to absorb it |
| Fixed viewport | Browser numbers depend on viewport (rows rendered, layout cost). Use the E2E reference viewport and state it. Measure in a visible tab; background tabs throttle timers |
| Percentiles, not averages | p75 and p95 (p50 for context); never a bare mean |
| Run count | Minimum 5 per configuration; report outliers, never drop them silently. For long-window probes spanning several poll cycles, fewer windows with many cycles each is acceptable; say which trade you made |
| State the machine | Dev vs prod build, machine, browser version, and whether mock-synthesis cost sits in the measured path (then label numbers as upper bounds) |

Before citing any perf script, `ls` its directory. Package scripts can outlive the tools
they point at.

## 3. Spike discipline

A spike is a timeboxed throwaway experiment on a branch. Without discipline, spike branches
accumulate with no recorded findings, and one spike merge moved a submodule pointer and
regressed a production path.

1. **Timebox it** in the hypothesis doc (default 2-3 days). When time is up, write the
   result, even if it is "could not determine; here is the blocker".
2. **Never merge a spike branch to `<integration-branch>`.** This is convention, not
   enforcement: the pre-push hook checks lint, specs and coverage, not branch names, and
   host-side branch restrictions may not exist. If a spike proves an approach, re-implement
   it from current `<integration-branch>` as a normal feature branch, and diff submodule
   pointers before merging: `git diff <integration-branch> -- <submodule-dirs> | grep -A1 Subproject`.
3. **A spike's output is a written result; then the branch dies.** A spike whose only
   artefact is its branch produced nothing. If the branch must survive as reference, say
   so in the write-up's follow-ups, and why.

## 4. How a result becomes doctrine

A result that lives only in the write-up is doctrine for nobody. Route it:

| Result concerns | Update |
| --- | --- |
| Performance numbers, NFR validation, budgets | The `performance-experiments` thresholds table |
| A new symptom -> cause pair found while experimenting | The `debugging-playbook` table |
| A failed or abandoned approach worth remembering | The ticket and the write-up, so it is findable from the ticket |
| An architectural decision or invariant | The architecture doc or ADR |
| Config or flag behaviour discovered | The config recipe |
| Measurement tooling itself | The tooling doc; executable tools go in `tools/` |

Two gates on top: behaviour changes (a new gate, merge rule or required check) go through
change control with its review bar - an experiment win is an argument, not an auto-merge;
and new thresholds are **candidate** until ratified. Do not present a candidate as pass/fail
and do not remove the label without the team's sign-off recorded in the ratifying PR.

## 5. Worked exemplar (shape, not data)

An NFR load test done well:

| Step | What it looked like |
| --- | --- |
| Hypothesis and prediction | The NFRs stated as testable claims up front: "performance must not materially degrade between 1 and 1,000 active records" and "1,000 simultaneous status changes must not freeze the UI", with the poll interval and batch size as the predicted envelope |
| Harness | A written plan before running: an N-record generator cycling the status archetypes, controlled by query params, auth bypassed the way the E2E suite does it; the results doc lists the exact re-run recipe |
| Measure | In-page probes in a visible tab: `PerformanceObserver('longtask')`, event-loop lag sampling, Event Timing API input latency, heap; windows spanning 3-8 poll cycles |
| Compare | p50/p95/max per metric, 1 vs 1,000 records, per surface: 0 long tasks at 1 record vs one ~430 ms task per cycle at 1,000; p95 loop lag <= 2 ms between cycles |
| Decide | Explicit verdicts, including "qualified pass" with the honest caveat that in-page mock synthesis inflates the 430 ms, so it is an upper bound |
| Record | Plan and results committed; a product bug found en route filed as its own ticket, not buried |
