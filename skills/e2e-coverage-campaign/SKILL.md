---
name: e2e-coverage-campaign
description: Use when systematically closing an E2E coverage gap rather than writing one test - "which user stories have no E2E test?", "which domains are untested?", "map stories to specs", "plan E2E coverage for this epic", "why doesn't this spec run in CI?", "which script covers my feature?" - or when defining the E2E definition of done for a release.
---

# E2E coverage campaign

## Overview

User stories that are not systematically verified end to end stay unverified until
someone runs a campaign: inventory, gap map, close gaps one story at a time, wire into
`<ci>`, keep it closed. Each phase has an exit gate. This recipe decides **what to test,
where it lives and when the gap counts as closed**; writing the test is a job for a test-authoring skill (see the note below),
and what counts as evidence is `validation-and-qa`.

One doctrine frames everything: **E2E runs against stubbed network, never a deployed
environment**, locally and in CI. "It worked on the test environment" is not E2E evidence.

## When to use

- Nobody can say which stories or domains have E2E coverage.
- An epic or release needs an E2E plan, or a definition of done for E2E.
- A spec exists but never seems to run in CI.

Not for writing, fixing or explaining one test (the Cypress team publishes a
`cypress-author` skill in `cypress-io/ai-toolkit`; install that), judging evidence or
the unit-coverage gate (`validation-and-qa`), diagnosing one flaky run
(`debugging-playbook`), or branch and commit mechanics for landing specs
(`change-control`).

## Phase 0 - Inventory: what exists today

Build one table, domain by domain: where the specs live, how many spec files, which
script runs them, and whether CI's automatic list includes that script. Commands and the
table template are in [inventory.md](inventory.md). Counts are spec *files*, not test
cases, and the table goes stale every release; date it.

Three findings to look for, because they are the cheapest wins in the whole campaign:

- **Orphan suites.** Specs matched by the config's `specPattern` but by no per-domain
  script, or by a script CI's list omits. They run only in a full local run; CI never
  executes them. Wiring them in adds coverage without writing a test.
- **Stale scripts.** A script whose glob points at a directory that no longer exists
  reports "no specs found", which reads as zero failures. Trust the glob, not the script
  name. Delete or fix.
- **Partially stale aggregates.** A script that combines several domains keeps running
  after one of its globs dies, so the loss is invisible.

**Exit gate:** the refreshed table is recorded on the campaign ticket; every orphan is
either wired into a script and CI or explicitly deferred with a reason; stale scripts are
fixed or deleted.

## Phase 1 - Gap map: stories to specs

**Traceability convention.** The `describe()` title carries the ticket key:
`describe('Saved basket persistence (PROJ-123)', ...)`, with one nested `describe` or
`it` per acceptance criterion. It is greppable, which makes the gap computable:

```bash
grep -rlE 'PROJ-[0-9]+' <spec-dirs> | sort          # traceable specs
grep -rhoE 'PROJ-[0-9]+' <spec-dirs> | sort -u      # covered tickets
```

New specs must carry the key. Old specs are tagged when next touched, never in a bulk
rename: test-report history is keyed on titles, and a mass rename destroys the trend.
Measure the honest baseline first; a convention that exists in a handful of specs is a
convention you are adopting, not one you have.

**Story side.** Per epic, pull the done and in-progress stories from `<ticket-tracker>`
(check the project's actual issue-type names before writing the query) and diff the keys
against the grep. Classify each story:

- **covered**: a spec references it;
- **tagging gap**: an untagged spec demonstrably covers the behaviour; tag on next touch;
- **test gap**: nothing covers it.

**Prioritise by risk times usage**, not by epic order:

| Priority | What | Why |
| --- | --- | --- |
| 1 | The surface most users spend their time in | Highest exposure; recently reworked areas regress most |
| 2 | Data-heavy lists and dashboards | Wide blast radius, also where performance problems live |
| 3 | The money path (the journey the product is paid for) | Thin suites here are the most expensive gap |
| 4 | Orphan suites from Phase 0 | Specs exist; CI just never runs them |
| 5 | Everything else | By epic, as stories close |

Take usage from your documented non-functional requirements or analytics, not from
intuition.

**Exit gate:** a per-epic gap list in that order, and the campaign KPI baseline: the
percentage of done stories with a traceable spec.

## Phase 2 - Closing a gap: the per-story runbook

For one story from the gap list:

1. **Pick the spec's home.** Behaviour owned by one feature package that has its own
   suite goes in that suite, matching that directory's file extension (the `specPattern`
   can differ per directory). A journey that crosses features, or a domain with no suite
   of its own, goes in the app-level suite under its domain directory. A new domain
   directory needs a script and a CI-list entry in the same change, or it is born an
   orphan. If the suite lives in a separately versioned package or submodule, landing it
   is two changes; see `change-control`.
2. **Mock the network at the browser layer.** Register the shared intercept set in
   `beforeEach`; add a fixture and a targeted `cy.intercept` for a new endpoint. Stub the
   feature-flag file with the exact flag object the story needs, **before** `cy.visit`. A
   local mock server kept for manual browsing or performance runs is not the E2E backend;
   wiring specs to it creates a second source of mock truth.
3. **Page objects, then the spec.** Reuse or extend page objects rather than inlining
   selectors; selectors are test-id attributes. Title carries the key; one block per
   acceptance criterion. Write it with your test-authoring skill.
4. **Run and gate.** Confirm the script's glob matches your file, then:

   ```bash
   for i in 1 2 3; do <e2e-cmd>:<domain> || { echo "RUN $i FAILED"; break; }; done
   ```

   **Gate: three consecutive clean runs**, meaning zero failures *and* zero retry markers
   ("Attempt 2") in the output. With run-mode retries enabled, a headless pass may have
   failed once and retried. A spec that needs the command timeout raised beyond the
   global value, or passes only on retry, is not done: fix the intercept ordering or the
   app (`debugging-playbook`).

**Exit gate per story:** spec merged in the right home, key in the title, the three-run
evidence in the PR, the domain wired into a script and the CI list if new. Record the
domain's wall-clock time; a suite that grows past roughly ten minutes locally is a
candidate to split before it becomes a CI batching problem (a heuristic, not a rule).

## Phase 3 - CI integration

Read the pipeline definition, not the documentation, and write down:

- **When the E2E stage runs**: which branches trigger it automatically, which build
  parameter forces it, and whether a commit-message marker can request specific domains.
- **Which domains run**: the automatic list, and the selection logic. Test it with a
  real branch name. A pattern such as `release/**` placed in a literal list-membership
  check never matches `release/1.2`: the stage triggers and then runs nothing, printing
  "no tests to run" on a green build.
- **How they run**: batch size, and against what (a static build of the app with the
  network still stubbed).
- **Any allow-failure switch.** If a parameter downgrades E2E failures to a warning, a
  green build that used it proves nothing. Check the build parameters before citing it.
- **Outputs**: one report file per domain, plus videos and screenshots as build
  artifacts. A reporter that is installed but not imported is dormant; do not cite it.

If a second, fuller mock mode is under construction (containers serving the backend from
its API specifications), label it in-progress and keep the browser-layer path as the
supported one until it is real.

**Exit gate:** every campaign domain can be requested explicitly; selection quirks are
confirmed and ticketed; per-domain report files are present in the artifacts of one full
`<integration-branch>` run.

## Phase 4 - Keeping it closed

1. **Definition of done.** A user story ships with a ticket-keyed E2E spec in its domain,
   or the PR description states an explicit exemption and why (pure refactor,
   backend-only, or covered by a named tagged spec). Agree it through `change-control`;
   reviewers check for the spec or the exemption line (`pr-review`).
2. **Re-run the inventory and the traceability grep once per release.** The KPI trends
   up or the campaign has stalled.
3. **Flake quarantine.** A spec failing intermittently on `<integration-branch>` gets one
   diagnosis pass. Not fixed the same day: skip it with a dated comment and a ticket,
   never delete it, and never let a flaky spec teach the team to ignore red. A
   quarantined spec reopens its story's gap. Pass-on-retry is early-warning flake.
4. **New domain means new script and CI-list entry, in the same PR.** Orphans exist
   because this step was skipped.

## Wrong paths

| Do not | Why |
| --- | --- |
| Point the suite at any deployed environment | Non-deterministic, coupled to real authentication, and dangerous on shared tenant data |
| `git add -A` while local clones of other repositories sit inside the tree | Commits them as gitlinks that break every other checkout; keep such directories untracked and ignored |
| Treat a local mock server as the E2E backend | Two sources of mock truth |
| Bulk-rename `describe` titles to add keys | Destroys report trend history |
| Raise timeouts or lean on retries to get green | Masks the defect the three-run gate exists to catch |
| Cite a green build that allowed test failures | The failures were downgraded, not absent |

## Adapt to your repo

- `<e2e-cmd>:<domain>`: your per-domain script prefix, and `<spec-dirs>`: the directories
  in your `specPattern`.
- The ticket-key regex (`PROJ-[0-9]+`) and the `<ticket-tracker>` query for done stories.
- The CI domain list: file and variable in your `<ci>` pipeline, the force parameter,
  the commit marker if any, and the allow-failure switch if any.
- Retry setting and global command timeout from your config; adjust the retry marker
  text if your runner prints something else.
- The priority table: replace the generic rows with your named domains and the usage
  figures that justify the order.
- Your shared intercept helper, flag-stub helper, fixture and page-object directories.
- The cadence for refreshing the inventory, and where the table is recorded.
