# Experiment: <short name> (<PROJ-123 if any>)

> Copy this file at the start of the experiment. Fill **Hypothesis** and **Prediction**
> before running anything; a hypothesis without a predicted number is not testable. File
> the completed write-up per "How a result becomes doctrine" in research-methodology.md.

## Hypothesis

<!-- One sentence. A falsifiable claim about this repo.
Example: "Virtualising the invoices table cuts the 1,000-row poll-cycle long task from
~430 ms to under 100 ms." -->

- **Timebox:** <e.g. 2 days, ends YYYY-MM-DD>
- **Prior attempts checked:** <none found / ticket or write-up N applies because ...>

## Prediction

<!-- Numbers, written before measuring. If you cannot predict, this is a baseline
measurement: say so, and state what the follow-up hypothesis will predict against. -->

| Metric | Predicted (p75 / p95) | Threshold that would mean "adopt" |
| --- | --- | --- |
|  |  |  |

## Harness and commands

<!-- Copy-pasteable, from repo root. Anyone re-runs this without asking you anything. -->

- **Branch / commit:** `<branch>` @ `<sha>`
- **Data:** mock server, seed `<value>`, config `<scale config>`, jitter = <value, or 0>
- **Viewport:** <width x height> (the E2E reference), **visible tab**
- **Build:** <dev serve / prod build>; **machine / browser:** <...>
- **Mock-synthesis cost in the measured path?** <yes -> numbers are upper bounds / no>

```bash
# exact commands, in order
```

## Results

<!-- Raw per-run numbers. Minimum 5 runs per configuration (convention; justify
deviations). Report p75/p95, never a bare mean. Do not drop outliers silently. Include
the control run (unchanged baseline re-measured in the same session as the after run). -->

| Config | Metric | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | p75 | p95 | Predicted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline |  |  |  |  |  |  |  |  |  |
| change |  |  |  |  |  |  |  |  |  |
| control (baseline again) |  |  |  |  |  |  |  |  |  |

Prediction vs actual: <one sentence: did the prediction hold?>

## Decision

<!-- Exactly one. -->
- [ ] **ADOPT**: promote to doctrine; update <owning doc>; behaviour changes via change
      control; any new threshold enters as **candidate** until ratified.
- [ ] **REJECT**: note why here so the decision is findable later.
- [ ] **REFINE**: new hypothesis and prediction; link the follow-up experiment doc.

Rationale: <2-3 sentences>

## Follow-ups

<!-- Tickets raised, bugs found en route (file them separately), caveats to re-measure,
and the spike branch's death date. -->

- Spike branch `<name>` deleted on <date> / kept as reference because <reason>.
