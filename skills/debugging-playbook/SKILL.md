---
name: debugging-playbook
description: Use when the app fails in a known way - blank screen or hang at startup, JSON.parse or null-property crash on load, API calls that 404 or hit the wrong host, a lazy route that will not load, a feature flag that will not apply, a login loop or empty permissions, stale data after switching tenant, install failures, a push rejected by the pre-push gate, mock server drift, E2E flake around flag fixtures - and for any unknown bug, failing test or runtime error.
---

# Debugging playbook

## Overview

Known failures get a symptom -> cause -> verification-command row so nobody re-derives
them. Unknown failures get the generic method. Either way the fix targets the cause, not
the symptom, and is proven by a test that failed first.

## When to use

- Any runtime error, failing test or "it worked yesterday" report. Check the table first;
  if nothing matches, run Part A.

Not for fresh-clone setup, push-gate policy questions, or adding a feature flag; those
have their own recipes. A page that is slow rather than broken belongs to
`performance-experiments`.

## Part A: the generic method

1. **Reproduce.** Get the exact error, stack trace or failing assertion and the smallest
   set of steps that triggers it. Note what differs from the working case: tenant, flag,
   build, browser tab.
2. **Isolate.** Narrow to one component, one service, one package boundary. Take the UI
   out of the loop where you can: call the service directly, replay the app's own request.
3. **Bisect when the cause is historical.** `git bisect start <bad> <good>` then
   `git bisect run <test-cmd>`. In a monorepo of submodules bisect the parent first; the
   pointer bump that introduces the bug names the submodule to bisect next.
4. **Prove it with a failing test first.** Write the smallest spec that fails on the bug.
   It is the only evidence that the fix is the fix, and it keeps the regression out.
5. **Fix the root cause, not the symptom.** Grep every caller of the function you are
   about to touch. One guard in the shared function is a smaller diff than a guard in
   every caller, and patching only the path the ticket names leaves the siblings broken.
6. **Verify with a command and paste its output.** `<test-cmd> <project> --coverage`, plus
   the E2E suite for the domain if one exists. "Tests pass" without output is a claim.

Framework patterns to check before digging: `ExpressionChangedAfterItHasBeenChecked` ->
state mutated in a lifecycle hook; OnPush not updating -> the input reference did not
change; a leak -> missing `takeUntilDestroyed()`; `NullInjectorError` in a spec -> missing
provider in the test module; `Cannot find module` -> path aliases or a stale build cache
(`nx reset`).

## Part B: known failure modes

Keep one table. Each row is a symptom, the project-specific cause, and one copy-pasteable
command that confirms or rules it out. The rows below are the transferable ones; replace
paths and keys with yours and add your own.

| Symptom | Likely cause | First command |
| --- | --- | --- |
| Blank screen or spinner forever at startup | An app initializer stalled (auth config fetch, i18n load) or its asset request failed. A flag loader that swallows errors does not hang; it makes every flag silently false | `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4200/assets/auth-config.json`; DevTools Network filtered to `assets/` for a request stuck pending |
| `SyntaxError` from `JSON.parse` or `Cannot read properties of null` on load | Corrupt or missing stored tenant-context keys. The production environment file parses without the null guards the dev file has, so it crashes only in prod builds | Browser console: `['activeTenant','userState'].map(k => { try { return [k, !!JSON.parse(sessionStorage.getItem(k))] } catch { return [k, 'CORRUPT'] } })` |
| API calls 404, hit the wrong host, or connection refused | The URL builder returned null because context keys are missing; or the dev proxy target is not what you think (the mock server rewrites it, and a stopped mock leaves it pointing at nothing) | `grep -n '"target"' src/proxy.conf.json && git diff src/proxy.conf.json` |
| Lazy route fails to load (`Cannot find module '@scope/...'` or routes `undefined`) | Submodule not initialised, or the package barrel stopped exporting the routes symbol the shell expects | `git submodule status \| grep '^-'`, then `grep -n 'appRoutes' <package>/src/index.ts` |
| Feature flag not applying | Drift between flag sources (repo file, served asset, deployed config); a misspelled key (the key as spelled in code is the contract, and correcting it in one place silently disables the flag); or the flag read at construction before config loaded, so it works after a route change but not on first paint | `curl -s http://localhost:4200/assets/features.json`; `diff <(jq -S keys .features.json) <(jq -S keys src/assets/features.json)` |
| Login loop, or empty permissions though the backend is up | A client-side outage cooldown latched in session storage and short-circuits requests for minutes after recovery; or mixed state between two auth paths (storage says one, cookie says another) | Browser console: `sessionStorage.getItem('<outage-cooldown-key>')` (example name: `authServiceDownUntil`); clear it and reload. Empty permissions from the server is an authz issue, not a UI bug |
| Stale data after switching tenant or account | Data services cache entities in memory and session storage and nothing expires them; a newer service was never added to the switch-time cleanup list | `grep -rn 'storedInSession = true' libs/shared/data-access --include='*.ts' \| grep -v spec`; `grep -n <reset-fn> src/app/<cleanup-file>` (example names: `resetStateData`, `app-cleanup.ts`) |
| Install fails | A registry token env var referenced unconditionally but unset; a patched dependency whose patch file was modified; the git-hooks postinstall throwing when `.git` is absent (CI archives); native binaries copied across platforms | `echo $NPM_TOKEN; yarn --version; ls .yarn/patches`, then `rm -rf node_modules && yarn` |
| `git push` rejected | One of the pre-push gates: lint on changed files, a missing sibling spec, coverage below `<coverage-threshold>` | Read the `[pre-push]` lines; `npx eslint <file> --fix`; `<test-cmd> <project> --coverage` |
| Mock server not serving, or the app not hitting it | Port clash; the proxy rewrite left by a previous mock run; the wrong dataset config loaded | `lsof -i :4300; git diff src/proxy.conf.json; echo $MOCK_API_CONFIG` |
| E2E flake on feature-flagged UI | The default flag stub is stale and lacks the flag under test; or the intercept is registered after the first visit, so the app gets the real flag file and behaves differently locally and in CI | `grep -rn '<flag-stub-helper>\|<intercept-setup-helper>' <failing-spec>` (example names: `getFeatureVersion`, `setupIntercepts`) |
| A runtime global such as `$localize` undefined in a unit test | A barrel import drags in a component whose runtime global is initialised only in its own project | `grep -n '<barrel-alias>' <spec>`, then `jest.mock('<barrel-alias>', ...)` |

## Maintaining the table

- Every row names a file or key the reader can check. Line numbers drift, so cite a
  `grep`, not a line.
- Keep a re-verification list beside the table: one command per volatile fact (initializer
  order, active proxy config path, cooldown duration, the gate list). Re-run it when the
  table feels stale.
- A new symptom -> cause pair found while debugging goes into the table in the same PR as
  the fix.

## Gotchas

- Session storage is per tab. "Works in my other tab" is the stale-context failure mode.
- Do not delete a protective mechanism (an outage cooldown, a deliberate dependency pin)
  to make a symptom go away. Clear the latch or restore the file.
- `cmd | tail` reports the pipe's exit status, not the command's. Check the real exit code
  before trusting a green run.
- A fix without a failing-first test is a hypothesis that happened to compile.

## Adapt to your repo

- `<test-cmd>` and `<lint-cmd>`: the per-project test and lint invocations.
- `<coverage-threshold>` and the exact list of pre-push gates, with the output prefix the
  hook prints.
- Context keys: replace `activeTenant`, `activeAccount`, `userState` and
  `authServiceDownUntil` with your session-storage key names.
- Flag sources: the paths of every place a flag can be defined, and the served URL.
- Proxy and mock server: the proxy config path, the mock port, and the config env var.
- Delete rows that do not apply; add the failure modes your repo has actually seen, each
  with a command.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira,
Bitbucket, Jenkins).
