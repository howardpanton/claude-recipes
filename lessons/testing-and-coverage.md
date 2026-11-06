# Testing and coverage

Lessons about proving a change works: mutation testing, text contracts, evidence, coverage
gates, local E2E, and Jest, Angular and Sentry traps. Each entry: symptom -> cause -> rule.

## Mutation testing and contracts

**Commit before mutation testing**

**Symptom:** after a mutate -> run -> revert loop your own new test fails in the full suite,
reading like a regression in the code; the fix you verified an hour ago is gone.
**Cause:** the revert is `git checkout <file>`, which restores HEAD and destroys every
uncommitted edit in that file, not just the mutation. The test passed before the revert, so
there was no failure signal. Learned the hard way.
**Rule:** commit the real change first, then mutate against committed code. After any revert,
`grep -c <new-symbol> <file>`; zero means the edit is gone. A PreToolUse guard that denies
`git checkout --` or `git restore` on a dirty path is worth having.

**Text contracts pin shape, not order**

**Symptom:** an assertion that call A appears before call B passes against the mutation that
moved A back outside B's `try`.
**Cause:** contracts over raw source are substring matches; position is cheap to satisfy and
containment is not expressible as an index comparison.
**Rule:** pin the wrapped shape on whitespace-collapsed source, for example
`src.replaceAll(/\s+/, ' ').contains('try { assertOwnership(script, state.handle) } catch (Exception failure) { state.operationFailure = failure }')`.
Mutation-test every new contract assertion before believing it; the first version here
looked right and caught nothing.

**Run the suite against the baseline before blaming your change**

**Symptom:** a block of contract files fail on an untouched checkout.
**Cause:** they need the CI plugin classpath the plain Groovy image lacks.
**Rule:** run the suite on the base commit first and record the baseline failures; only new
failures are yours. Same for Jest: a full `nx run-many -t test` next to a production build
produced worker `SIGSEGV`s; rerun the failed projects sequentially before blaming the
change.

## Evidence

**"Tests pass" is not evidence without numbers**

**Symptom:** a PR says tests pass; there is nothing to verify; a coverage regression ships.
**Cause:** an unverified claim reads the same as a verified one.
**Rule:** paste the spec count and the four coverage figures (statements, branches,
functions, lines) for the affected project, and the ESLint result for every changed file.
Filtering Jest output with `rg '●.*›'` hides `● Test suite failed to run` (a TypeScript
error in a spec), so a sibling suite's pass count looks like success: include
`Test suite failed` in the filter. Verify claims about UI states with a test before stating
them to a reviewer.

**Prove flake with a control run**

**Symptom:** an E2E domain fails on the branch; "pre-existing" is asserted, not shown.
**Cause:** local browser quirks and clock-boundary tests fail identically on the base branch.
**Rule:** decide per ticket which E2E domains the change can touch, record the decision, and
treat any failure not proven pre-existing by a control run on the base commit as blocking.
Cheap control run without a worktree when the changed directory is clean:
`git checkout origin/<branch> -- <dir>`, run the suite, `git checkout HEAD -- <dir>`. CI
serves the app under a base path, so assert pathnames with `contain` or `include`, never
`eq`; a new spec on a release branch meets CI for the first time on the release-train run.

**No ticket keys in code, comments or test titles**

**Symptom:** review rejects `// (PROJ-123)`, a JSDoc line, an HTML comment,
`it('PROJ-123 ...')` and a Cypress comment alike.
**Cause:** code outlives the ticket; the behaviour description is what the next reader needs.
**Rule:** write "until the catalogue lookup lands", not "until PROJ-123 lands". Before
committing, the added lines must be clean:

```bash
git diff <base>...HEAD -U0 -- <code paths> | awk '/^\+\+\+ b\//{f=substr($0,7)} /^\+/ && !/^\+\+\+/ && /PROJ-[0-9]+/{print f": "$0}'
```

Pre-existing keys in lines you did not add are out of scope. Commit messages and PR
descriptions keep their `[PROJ-123]` prefix.

## Gates

**The coverage gate is per push; the repo-wide number is a goal**

**Symptom:** a push fails the `<coverage-threshold>` gate on a project whose number moved
because of a file nobody touched; another run reports "No tests found" with confidence.
**Cause:** the hook gates each touched project as a whole, reading
`coverage/<project>/coverage-summary.json`; the app shell's Jest config ignores `libs/` and
`apps/` (each has its own `jest.config.ts`), so a changed file the runner's patterns do not
match triggers no tests at all.
**Rule:** the enforced gate is "every touched project at or above `<coverage-threshold>` (80%
as the worked example) in statements, branches, functions and lines, read from
`coverage/<project>/coverage-summary.json`"; the repo-wide threshold is a campaign goal, not
the push gate. A changed file the runner does not match triggers no tests: run the owning
project yourself and say so in the PR. Use the owning project's `jest.config.ts`. Jest 30's
flag is `--testPathPatterns`.

**`runInBand` removal reverted; the agent deaths were infrastructure**

**Symptom:** parallel Jest workers appear to kill CI agents
(`Cannot contact <agent>: InterruptedException`) on two builds.
**Cause:** a fleet instability window; the next build died identically with serial restored,
and later serial builds ran clean on the same fleet.
**Rule:** before blaming a config change for agent deaths, run the control (the revert) on
the same fleet and compare signatures. `--runInBand` silently overrides `--maxWorkers`. Keep
the fixes that were real: a stage timeout with headroom (suites that died at exactly the
limit, all green) and fake timers for clock-boundary tests.

## Local E2E

**Run Cypress against a dev server on another port**

**Symptom:** starting the E2E server kills another worktree's dev server on the default port;
`cy.visit` gets nothing although `curl` works; `426 Upgrade Required` on visit.
**Cause:** the test-server script runs a kill-port step; `nx serve --port N` binds `[::1]`
only while Cypress resolves `localhost` to `127.0.0.1`; another local tool squats the port
on IPv4.
**Rule:** `npx nx run <app>:serve --port 4300 --host 127.0.0.1` and
`CYPRESS_BASE_URL=http://localhost:4300 npx cypress run --spec <spec>`; the spec intercepts
cover the API, so no mock server or login is needed; the dev server hot-rebuilds on a
submodule checkout, so with-fix and control runs need no restart. Check the port on IPv4
with `lsof -nP -iTCP:<port> -sTCP:LISTEN`. A fresh worktree needs the gitignored auth,
feature-flag and proxy config copied in, or every spec fails on a config error.

## Framework and library traps

**A barrel re-export of an ESM-only dependency breaks Jest everywhere**

**Symptom:** `SyntaxError: Unexpected token 'export'` in a different set of projects on each
build.
**Cause:** a shared UI barrel re-exported a component that imports an ESM-only subpath; every
spec importing anything from that barrel pulls it into its Jest graph; which projects fail
depends on scope detection.
**Rule:** before adding a dependency to a shared barrel, check whether it ships ESM-only
subpaths; give such components a secondary entry point. Centralise
`transformIgnorePatterns` in the Jest preset and delete per-project overrides (a
per-project value overrides the preset entirely). Trace the barrel line, not the failing
project.

**A value import closed a barrel cycle; the base class became `undefined`**

**Symptom:** `TypeError: Class extends value undefined is not a constructor or null` in every
spec of a data-access library.
**Cause:** `libs/shared/utils` imported a service class from `@scope/data-access` as a DI
token. Earlier imports on the same edge were types, erased at compile time, so "the edge
already exists" was false; the build tool's circular-dependency warning was explained away.
**Rule:** in the lower library never import a value from the higher one; declare an
`InjectionToken` in the lower library and provide it from the app shell
(`{ provide: TOKEN, useExisting: RealService }`). Treat a circular-dependency warning as a
build failure in waiting. When checking whether an edge exists, check whether its imports
are type-only.

**`[ngValue]` projected into a custom select wrapper is a silent no-op**

**Symptom:** options are valueless, the bound model matches nothing (`selectedIndex -1`), the
change event emits padded option text and the picker renders blank on load.
**Cause:** `NgSelectOption` needs a host `SelectControlValueAccessor`, which projected content
never gets.
**Rule:** explicit string `value` attributes, a string model, numeric coercion in the change
handler; pass `name`, or the test id renders as `form-select-undefined`. Follow the existing
call sites.

**Angular spec and template traps**

**Symptom:** `NG0100 ExpressionChanged` in a page spec from `[class.x]="panelRef.expanded"`
although the browser is fine; a Jest spec hangs on a router-loop guard; an outside-click
handler sees a detached button; `performance.mark` is undefined in jsdom.
**Cause:** binding to a child's state in the parent template; an uncapped guard stub; Angular
re-renders between a button's click and `document:click`; jsdom has no `performance.mark`
and Angular emits its own marks on first render.
**Rule:** a static class with an arbitrary variant (`[&.mat-expanded]:!overflow-visible`)
instead of binding to the child; cap guard stubs; guard outside-click handlers with
`element.isConnected`; stub `performance.mark` in specs and count only your own mark name.
For INP-style percentiles, five runs are one outlier from a 16 ms swing: use ten and ten.

**Sentry `beforeSend` only sees error events**

**Symptom:** console breadcrumbs carrying tokens still ship on transaction events after
scrubbing was added to `beforeSend`.
**Cause:** `processBeforeSend` calls `beforeSend` only when `isErrorEvent(event)`; transaction
events get scope breadcrumbs, tags, extra and contexts merged in unconditionally.
**Rule:** register the same redaction on `beforeSend` and `beforeSendTransaction` through a
shared helper; keep `beforeBreadcrumb` as belt and braces. Scrub the sampled path too.

**A credential-shaped test fixture is a secret to every scanner**

**Symptom:** a secret scanner, a reviewer or the git host's push protection flags a "Slack
token" in a test fixture for the very hook that blocks tokens; deleting the file does not
clear it, because the first commit still carries it.
**Cause:** a fake-but-well-formed value (`xoxb-...`, `AKIA...`, a `BEGIN ... PRIVATE KEY`
block) is indistinguishable from a real one to a pattern matcher, and history keeps it.
**Rule:** fixtures hold a placeholder; the test runner assembles the token-shaped value at run
time from parts (`printf 'xox%s-%s' b ...`), so no file in the repo ever contains the full
shape. If one slipped into history, rewrite the commit and prune before the repo is public.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
