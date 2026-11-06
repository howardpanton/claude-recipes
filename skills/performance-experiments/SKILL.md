---
name: performance-experiments
description: Use when a data-heavy page is slow or hangs at scale, when asked "does this meet the NFRs?", "prove my perf fix is real", "is this actually faster?", "how many runs are enough?", "should I merge my spike branch?", when a PR touching polling, pagination, caching, change detection or a shared table needs before/after numbers, or when writing up a benchmark or proposing a new performance threshold.
---

# Performance experiments

## Overview

No fix without a baseline number, no merge without an after number, both from the same
harness. Every expected gain is a candidate until measured in this repo, and every new
threshold is a candidate until the team ratifies it.

## When to use

- A page misses its targets at the scale the product must sustain.
- A PR changes a polling interval, page size, cache, change-detection strategy or a shared
  table.
- A spike or benchmark needs a write-up or a merge decision.

Not for profiling-tool how-tos, functional bugs that happen to be on a slow page
(`debugging-playbook`), or branch and gate mechanics.

**REQUIRED:** read [research-methodology.md](research-methodology.md) before claiming a
number, and copy [research-template.md](research-template.md) before running anything.

## Phase 0: a reproducible baseline

| Requirement | How |
| --- | --- |
| Deterministic data | The mock server with a seeded PRNG; pin and record the seed (`MOCK_API_SEED=1337`) |
| Fixed scale | Named scale configs (small / medium / large / stress), never hand-tuned data; name the config |
| Pinned latency | Response jitter is usually `Math.random`; set it to 0 for strict timing comparisons |
| Fixed viewport, visible tab | Use the E2E reference viewport; background tabs throttle timers and invalidate numbers |
| Percentiles | Report p75 and p95, never a bare mean; GC pauses and poll cycles make means lie |
| Run count | Minimum 5 per configuration; report outliers, never delete them |
| State the machine | Dev vs prod build, browser version, and whether in-page mock synthesis is in the measured path (then numbers are upper bounds) |

Run the mock server at the chosen scale in one terminal, the app in another, measurement
in a third: a scripted page harness where one exists, otherwise
`npx lighthouse http://localhost:4200/<route> --output=json --output-path=reports/lh-<page>-<scale>.json`
plus a DevTools performance trace for long-task attribution. Record a page x scale x
metric table: LCP, INP, CLS, JS heap, long tasks, API calls on load.

**Gate.** Run-to-run variance above ~10% with jitter pinned means the harness is broken.
Fix it first (dev-server rebuilds mid-run, extensions, thermal throttling, a manual auth
step timing out). Never tune app code against a noisy instrument. If a page cannot be
loaded at target scale at all, the deliverable is harness extension, not app tuning.

## Phase 1: the thresholds table

One row per page: what it must sustain (the ratified scale NFR), the refresh budget, what
the code polls today (verified with a grep), and the Core Web Vitals targets at that scale.
The rows below are illustrative; replace them with your own ratified numbers.

| Page | Must sustain | Refresh budget | Polling in code (verified) | CWV at p75 |
| --- | --- | --- | --- | --- |
| `apps/billing` invoices | 1,000 rows per tenant | on demand | - | LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 |
| `apps/search` results | 5,000 search results | every 30 s visible, paused off-screen | `timer(0, 30_000)` in `results.component.ts` | same |
| All pages | 10 concurrent users per tenant | - | - | initial bundle within the build budget |

Binding rule: a PR that changes a polling interval, page size, scale constant or budget, or
moves a cited line, updates this table in the same PR; a reviewer treats a missing update
as blocking, because the table's authority depends on its cited lines being real. Where
code and budget disagree (polling three times faster than the budget), the ticket that
touches the interval reconciles them; the sheet may predate the code.

**Gate decision**, per page x metric: meets targets at NFR scale -> add regression
protection and move on; misses by under 2x with rendering-dominated long tasks -> render
lane; network waterfall dominates -> request lane; main-thread stall on entry or tenant
switch -> state lane; pagination chatter or oversized payloads -> payload lane; misses by
2x or more on several metrics -> expect a combination, still one measured change at a time.

## Phase 2: lanes, one per PR

| Lane | Moves | Risk to measure |
| --- | --- | --- |
| Render | Virtualise lists; paginate via the shared table; OnPush and trackBy audit; defer off-screen work | Virtualisation breaks auto-height, sticky headers and focus order; OnPush with mutated inputs silently stops updating |
| Request | Batch status endpoints (a backend ticket); polling adherence to budget (product sign-off for staleness); request dedup or short-TTL cache | A cache must still reset on tenant switch; prove it with a switch-context test |
| State | Batched async loading of large stored maps; decomposing god services slice by slice | Async loading delays the loaded emission; callers that assume synchronous availability break |
| Payload | Page size; trimming over-fetched fields | Backend-dependent; confirm the real API's page size before optimising around the mock's |

Never mix lanes in one change. A shared table that has absorbed many behavioural fixes is
a cross-cutting change and is reviewed as one.

## Proving a fix is real

1. Same harness, config, seed, jitter, viewport, before and after.
2. Five or more runs each; p75/p95 side by side with the prediction written beforehand.
3. **A control run.** Re-measure the unchanged baseline in the same session as the after
   run. If the control moved, the machine moved, not the code.
4. In the PR description: config name, page, metric, before -> after, percentage delta. A
   perf claim without numbers is rejected in review.

## Spike discipline

Timebox it in the hypothesis doc (default 2-3 days). Never merge a spike branch to
`<integration-branch>`: spike branches carry stale submodule pointers and a merge takes
them along (learned the hard way). Re-implement a proven approach cleanly from current
`<integration-branch>`, and diff pointers before merging anything:
`git diff <integration-branch> -- <submodule-dirs> | grep -A1 Subproject`. A spike's
output is the written result; then the branch dies.

## Proposing a new threshold

A number your experiment produced enters the thresholds table labelled **candidate**, with
the evidence beside it. It becomes a pass/fail gate only when the team's agreement is
recorded in the ratifying PR. Never present a candidate as a gate.

## Output format

The completed research template: hypothesis with predicted numbers, harness and commands,
results table with p75/p95, decision (adopt / reject / refine), follow-ups. File it where
the next person looks: the owning doc's findings section or the ticket, never only the
branch.

## Gotchas

- Package scripts that point at a directory which no longer exists fail quietly; `ls` the
  harness before citing it.
- A visual-regression CI stage is not a performance stage.
- Blind `shareReplay` sprinkling is how stale-data bugs enter. Every cache needs a number
  and a switch-context test.
- A dependency upgrade "for performance" is a separate initiative with its own risk
  budget unless a trace attributes the cost to that dependency.

## Adapt to your repo

- `<integration-branch>` and the submodule directories in the pointer diff.
- Mock server: the seed env var, scale config names and the jitter setting.
- The thresholds table: your pages, your ratified scale NFRs, and the grep that verifies
  each polling interval.
- The E2E reference viewport (read it from your E2E config).
- The measurement harness command, or delete the Lighthouse fallback if you have a
  scripted one.
- Who ratifies a threshold and where the agreement is recorded.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
