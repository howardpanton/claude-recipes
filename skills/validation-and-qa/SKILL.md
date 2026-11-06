---
name: validation-and-qa
description: >-
  Use when deciding whether a change is actually proven to work - "how do I
  prove this works?", "what tests do I need before pushing?", "is a screenshot
  enough?", "coverage below threshold" or "missing spec file" pre-push
  failures, "how do I run one spec / one project with coverage?", "the E2E
  passed on retry", flaky E2E runs, "how do I check repo-wide coverage?", a push
  whose gate detected no changes, or any claim of "done" that cites no numbers.
---

# Validation and QA - what counts as evidence

## Overview

"Done" means the highest practical layer of evidence has been run and its
real output quoted. Anything else is a claim.

## When to use

Before saying a change works, before pushing, and when reviewing someone
else's "tests pass". Not for writing E2E code (your E2E authoring skill, if you keep one),
diagnosing a failing test (`debugging-playbook`), bulk spec backfill
(`test-writer` agent), or push and bypass policy (`change-control`).

## 1. The evidence hierarchy

Cite the highest layer that is practical for the change.

| Layer | Scope | Command | Feeds |
|---|---|---|---|
| 1. Unit tests with coverage | One project | `<test-cmd> <project> --coverage` | Pre-push gate, CI unit stage |
| 2. Targeted pre-push run | Changed files' projects only | the hook's runner, `node <hook-runner>` (example name: `tools/run-changed-tests.js`) | The push itself |
| 3. Full-suite coverage | Whole repo | `<coverage-track-cmd>` | Coverage trend history |
| 4. Component tests | One component in a real browser | `<e2e-cmd>:component` | CI E2E stage |
| 5. E2E | A user journey through the built app, network mocked | `<e2e-cmd>:<domain>` | CI E2E stage |
| 6. Running app | What a user sees | dev or mock server + screenshot | Supplement only |

E2E **always** runs against stubbed network (fixtures), never a deployed
environment. "It works on the nightly environment" is observation, not
evidence.

## 2. What does NOT count

- **"Tests pass" without numbers.** Paste the real output: counts and the four
  coverage percentages.
- **"It compiles" / "lint passes."** Necessary, never sufficient.
- **A screenshot of code.** Proves nothing ran.
- **A UI screenshot as proof of behaviour.** It proves rendering at one
  instant - a supplement for visual changes, never the evidence.
- **"Should work" / "safe change."** Run it.
- **A green CI run under an allow-failures parameter** (one that downgrades
  lint/test failures to UNSTABLE so an artifact still builds). Read the build
  parameters before trusting the badge.
- **Assert-nothing tests** (`expect(service).toBeTruthy()` alone).
- **A push that bypassed the hook.** See `change-control`.
- **A push whose pre-push gate listed no changed files.** The push exits 0 but
  ran nothing; run `<lint-cmd>` on the changed files and the affected specs
  with coverage yourself, and say so in the PR.

## 3. The unit-test gate

The pre-push hook (anatomy in `change-control`) requires:

1. Lint clean on every changed non-spec `.ts`/`.html`.
2. A **sibling spec** for every changed component/service/directive/pipe/guard:
   same path, `.ts` -> `.spec.ts`.
3. Every touched project at or above `<coverage-threshold>` on statements,
   branches, functions and lines, read from
   `coverage/<project>/coverage-summary.json`.

**Blind spot:** the targeted runner reacts only to those file patterns. A
changed model, helper, template or config triggers no tests. If your logic
lives there, run the owning project yourself and say so in the PR.

Reproduce what the hook will do by running its runner directly before pushing.

### Running tests

```bash
<test-cmd> <project> --coverage                       # one project
<test-cmd> <project> --testFile=<path/to/x.spec.ts>   # one spec (the hook's own form)
<test-cmd> <project> --testPathPattern='x.component'  # by name
```

Coverage summaries do not land in uniform paths across nested projects:
`find coverage -name coverage-summary.json`. A project with no `json-summary`
reporter only has the text report's "All files" row.

Copy a neighbouring spec's setup before inventing one. Excluding a
declaration-only file from `collectCoverageFrom` is honest; excluding logic to
dodge the threshold is not evidence.

## 4. Coverage trend tracking

Repo-wide coverage above `<coverage-threshold>` is the goal; the hook only
gates touched projects. A tracking script aggregates every project's summary
into a committed history file, `<coverage-history-file>` (example name:
`tools/coverage/coverage-history.json`).

- Commit the appended entry with your change; never rewrite past entries.
- The aggregate is a **simple mean of per-project percentages**, not
  line-weighted: a tiny 100% lib lifts it as much as a huge one.
- The tracking run uses `|| true`: it never fails on test failures. It is a
  measurement, not a gate.

## 5. E2E - always against mocks

- Every spec stubs the whole network in `beforeEach` from fixtures; feature
  flags are stubbed by intercepting the flags file **before** `visit`.
- Run only your domain (`<e2e-cmd>:<domain>`) and confirm green **twice**.
- Check a domain script's spec glob still matches a real directory before
  trusting "0 failures": a stale glob reports no specs found.

## 6. Flake discipline

- With `retries.runMode: 1`, a headless pass may have failed once. Look for
  `(Attempt 2)` in the output: pass-on-retry is a flake signal, not evidence.
- JUnit output (`results/junit/*.xml`) proves which tests actually ran.
- A test that needs a timeout above the global default is masking a real
  problem. Fix the intercept or the app; don't extend the wait.
- Known flake class: flag intercept registered after the app already fetched
  the flags file. Stub before `visit`, always.

## Gotchas

- `yarn test` may test the **default project only**, not everything. Read the
  script before quoting its result as "all tests".
- A karma-era `--include` flag on a Jest executor is ignored or errors; use
  `--testFile` / `--testPathPattern`.
- Specs that cover only the success path fail the branch threshold first;
  write the error and empty-state cases.
- Test a select by clicking a real option, not by calling the handler:
  selection bugs live in init code that direct method calls never reach.

## Adapt to your repo

- `<test-cmd>`: e.g. `npx nx test`, `npx jest --config=...`.
- `<coverage-threshold>`: from your Jest config and pre-push runner (80% here).
- `<coverage-track-cmd>` and the history file: your trend tooling, or delete section 4.
- `<e2e-cmd>`: your Cypress/Playwright script prefix; retries from its config.
- The hook's testable-file patterns: copy them from your pre-push hook.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
