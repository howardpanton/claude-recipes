---
name: qa-test-planner
description: Use when a release needs a regression or QA test plan - "write the regression test plan", "plan QA for this release", "what needs testing for fix version X", "assess release risk" - or before a release candidate is promoted to a shared test environment and someone must define what sign-off requires.
---

# QA test planner

## Overview

A plan's job is to be executable without further interpretation, and a plan is itself
evidence: every count, expected value and exit conclusion in it will be read as settled by
whoever signs off. Most of the effort goes into checks that can actually pass and entry
criteria that are resolved before the run starts.

## When to use

- A fix version is about to go to a shared test environment and nobody has written what
  to test.
- Asked to assess the risk of a release.

Not for executing the checks (the `browser-qa` recipe runs what this produces), deciding
whether the release ships (the plan defines what sign-off requires), or replacing
automation: anything deterministic and repeatable is proposed as an E2E test, and a plan
that re-tests the same mechanical assertion by hand every cycle is a backlog item.

## 1. Gather the release content

1. **The tracker issues in the fix version.** **Jira:** `project = PROJ AND fixVersion =
   <id>`. **GitHub:** the milestone. Capture key, type, summary, status and the surfaces
   each touches. Record the count and the split by type; it is what makes drift
   detectable later.
2. **The release candidate build identifier.** The fix version must be built into one
   promotable candidate.
3. **The backend change snapshot.** Frontend checks whose backend counterpart is not
   deployed cannot pass; they are Blocked. Compare the test environment against
   production, because production is where the release lands.
4. **The previous cycle's plan**, for conventions and regressions worth re-running.

Every issue in the fix version needs either a check or a recorded reason it needs none.
Verify every number before you assert it: if the plan states a label count, run the
query. A wrong label count makes the executor's reconciliation step fail by design and
hides real drift behind it.

## 2. Assess risk

| Cluster | What the checks look like |
| --- | --- |
| Marquee / release-gating | Happy path, the unchanged path it must not regress, and the boundary. A gate of the form "A applies unless B" needs all three cases, including precedence when both apply |
| Refactor | Expects no behaviour change: a smoke of the refactored surface. The risk is silent breakage where nobody looks |
| Resilience / failure handling | Passes only when the failure is actually injected |
| UI / layout | Cheap to check, easy to under-specify |
| Cross-cutting (shell, navigation, analytics init, shared libs) | A smoke across the main surfaces even when no ticket names them |

Flag frontend/backend coupling, shared-library blast radius, and anything that came from
error monitoring. Look for the programme, not just the tickets: several tickets serving one
migration or measurement can each pass their own ACs while the thing they exist for is
impossible (instrumentation stories that pass individually but carry no cohort marker, so
the before/after split they exist for cannot be made). Add an exit criterion for the
programme's coherence, phrased as a question someone must answer.

## 3. Structure the checks

One numbered table, `RT-01` upward: ID, environment, test and expected result, ticket refs.

- Expected result is concrete and observable: what renders, in which states, with which
  units. Not "metrics work".
- One check, one question, so a partial failure is expressible.
- Name the instrument when it is not obvious.
- `RT-01` is always entry verification: build string matches the candidate on every
  environment used.
- The last check is always a cross-surface smoke.

## 4. Writing a check that can actually pass

- **The expected result must be achievable.** A check can require an event that has no call
  site anywhere, or an "only" clause that fails because the page emits events on entry. A
  value taken from a spec or taxonomy is a hypothesis until something observes it: verify
  it while planning, or write the check so the discrepancy is the finding ("confirm which
  events fire; the inventory claims X").
- **The trigger must be reachable.** A check against a permanently disabled button is not
  a check, and the metric it serves is silently half-measured.
- **Expected results come from the AC, never from precedent.** A plan that encodes what
  the old page did teaches the executor to confirm the bug. Label precedent as context.
- **Say which flag state, literally.** Absent and `false` are different environments.
- **A flag-off check needs data that would render if the flag were on.** Otherwise
  "hidden" and "nothing to show" are indistinguishable.
- **Sequence conflicting flag states into separate passes** and say which combinations are
  valid; turning off a parent feature removes the surface a second check needs.
- **Ask whether a heavy fixture is real.** If the behaviour is computed in the browser,
  name the cheaper method (response rewriting, see `browser-qa`).

## 5. Entry criteria

List every fixture, access and account, and resolve as many as possible while planning;
this is where runs stall. One line per data fixture, plus the literal flag values each
check needs. Mark each **confirmed** (name, id, where it lives) or **still needed** (an
open risk against that check). Resolve with a data query, not the UI; list tables omit ids
and provisioning state. A fixture that does not exist in the target account is a planning
finding. Record the observation, not an untested explanation for a gap: "disabled on a
record in the wrong state" sends an executor to find one in the right state, when the
control may be disabled on every record. Feed resolved fixtures back into the plan; half
the entry criteria on a mature plan are inherited answers.

## 6. Environment split

Each check runs once. Assign every check to the primary test environment unless it cannot
support it; a check assigned elsewhere states the specific reason (which flag is absent,
which fixture exists only there). Entry verification runs on every environment used; the
cross-surface smoke runs once. Record moves made at execution time for the next cycle.

## 7. Exit criteria

Sign-off gates on clusters, not a pass count. Per gating cluster: the specific evidence
required (not "pages still load"); where a backend dependency makes a check Blocked rather
than Failed; known-at-risk items with the ticket that must resolve them; the programme
questions from section 2. Flag findings that are harmless now and unfixable later (a
measurement window that cannot be re-measured once a flag goes on): those are sequencing
decisions, not backlog items. Conclusions here are load-bearing: mark anything unverified
as an assumption, and correct by striking through and appending, never by silent edit.

## Output format

Publish as a new wiki page titled to match the series, using
[plan-template.md](plan-template.md). Link the release report and the previous plan, leave
the execution-evidence section empty, and hand to `browser-qa`. Wiki page updates are
usually full-body replaces: fetch, verify completeness, assemble locally, re-verify, send,
re-fetch.

## Gotchas

- Issues get added to a fix version after the plan is written. The executor re-runs the
  query at start; make that cheap by recording the key list in the plan.
- Restate the conventions every cycle: build string per result, 24-hour timestamps with
  timezone, the destructive-action rule, the privacy rule, soft-delete wording, tenant and
  flag-state recording. They are what make evidence comparable between cycles.
- Test records with lifecycles are created future-dated so they stay deletable.

## Adapt to your repo

- `<ticket-tracker>` query: the fix-version JQL or milestone filter, and the `<qa-label>`
  you use for coverage, if any.
- Environment names: replace "primary test environment" with yours and state the rule for
  assigning a check elsewhere.
- Build identifier: where it is shown (footer, `/version`) and how it maps to a candidate.
- Backend snapshot source: the module or service version page you diff against production.
- Wiki space and title series; delete the Confluence-specific "full-body replace" line if
  your tool appends.
- The E2E recipe that receives checks proposed for automation.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
