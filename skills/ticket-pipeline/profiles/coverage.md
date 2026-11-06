# Profile: coverage (fast path)

Applies to: a ticket whose summary is shaped "Achieve >= `<coverage-threshold>`
unit test coverage in `<project>`". The orchestrator sets this profile at
setup from the summary; the assessor never sees the ticket. Coverage tickets
are formulaic (measure, write tests until the threshold, lock the threshold,
open PRs), so ASSESS and PLAN are skipped and no stage needs the strongest
model.

## Not for

- Any production-code change -> the full pipeline. This path edits specs,
  test config and hooks only.
- Specs for one component as part of feature work -> the normal TEST stage.
- E2E coverage gaps -> a separate campaign; this is unit coverage only.

## Stages

| Stage    | Agent              | What happens                                                                                                                     |
| -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| SETUP    | orchestrator       | `HANDOVER_DIR` with one file, `coverage-run.md` (appended per run; an existing one means resume from its "Next" section). Preflight as usual. Tracker pickup. |
| BASELINE | orchestrator       | Run `<test-cmd> --coverage` for the project. Record the four global metrics and a per-file list of every file below threshold (path and failing metrics only, never the full report). Already above threshold on all four -> skip WRITE. |
| BRANCHES | orchestrator       | `feature/<TICKET>-<slug>` off the base, in the submodule and in the root (for the pointer bump), or root only.                   |
| WRITE    | `ticket-tester`    | Loop, max 3 iterations. Input is `coverage-run.md`'s below-threshold table. Specs only. Spot-check that new specs fail when the covered branch is broken. Commit, never push. Re-measure after each iteration. |
| GATE     | orchestrator       | Add or verify the global `coverageThreshold` in the project's test config; add the submodule-level pre-push hook if missing; lint; full suite green; commit `[<TICKET>] Add coverage threshold and pre-push hook`. |
| REVIEW   | `ticket-reviewer`  | Told the only handover is `coverage-run.md` and the change is spec/config-only. Then push, PR, comments and tracker sync from `side-effects.md`. Fix loop max 2, re-launching the tester (not a developer). |

## Rules that differ from the full pipeline

- After 3 WRITE iterations still short: stop, record the structural gaps in
  `coverage-run.md` (which file and branch, why it is unreachable in a unit
  test), and surface it. Never pad with assertion-free tests to exhaust the
  cap.
- Ticket bodies on campaign tickets are often copy-pasted and can name the
  wrong project. The summary and a maintained ticket-to-project table are
  authoritative; never route from the body.
- The project name in the build tool is not always the folder name. Verify
  with the tool's project listing before trusting a path.
- A follow-up "audit gap" ticket for a project already Done: first diff the
  parent's current submodule pin against that submodule's branch tip. If the
  gap closes at the tip, the fix is a pointer bump, not new specs.
- Big projects are batched: each run takes `--scope=<subtree>` (about 25
  files), gets its own branch and PR, and the ticket stays In Progress
  across runs. The global threshold is added only on the final batch;
  adding it early fails the gate for everything else.
- A failed ticket does not block a different ticket; the controller decides
  whether to continue.

## coverage-run.md template

```markdown
# Coverage run: <TICKET> - <project>

## Run <N> - <date>
Base: <branch> | Branch: feature/<TICKET>-<slug> | Scope: <glob or all>
Baseline: st <x>% / br <x>% / fn <x>% / ln <x>%
Below threshold: <file - failing metrics>, ...
Iterations used: <n>/3
Final: st <x>% / br <x>% / fn <x>% / ln <x>%
Structural gaps: <file:lines - why unreachable, or "none">
PRs: <submodule PR>, <parent PR>
Status: DONE | BLOCKED(<reason>) | PARTIAL

## Next (multi-run tickets only)
<remaining families or files>
```
