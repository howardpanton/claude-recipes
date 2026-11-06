# Process and estimation

Lessons about running work with agents in the loop: sizing, quality signals, release
mechanics, unattended sprints, and the small cloud and analytics mechanics that cost a day
each. Each entry: symptom -> cause -> rule.

## Estimation

**Points measure human effort, so score Clarity, Verification and Risk**

**Symptom:** estimates collapse to 1 because the agent wrote the code in minutes; the human
hours (review, proof, sign-off) go unbudgeted; points get lowered after the fact.
**Cause:** story points were measuring typing.
**Rule:** at refinement, score three dimensions 1-3 each:
- Clarity (effort to make it agent-ready): 1 clear acceptance criteria and a pattern
  exists; 2 unknowns, a design or API check; 3 new area or spike.
- Verification (effort to review and prove): 1 small diff, existing tests; 2 several
  components or a sub-project, new tests, manual QA on one surface; 3 spans projects or
  the pipeline, needs a real build, visual QA or customer sign-off.
- Risk: 1 internal or behind a flag; 2 user-visible on one surface; 3 shared libraries,
  the release pipeline, customer data, live operations.

Total to points: 3 = 1, 4 = 2, 5-6 = 3, 7-8 = 5 (confirm scope first), 9 = 8 (must split
or spike). Record the breakdown as a comment until the fields exist. Never lower points
afterwards because the agent was fast. Pipeline work almost always scores Risk 3 and
Verification 3 (live builds are the proof), so 5 is its floor. Before estimating any
"release the executor"-style change, read the whole call chain for coupling; stopping at
the first layer under-calls the size.

## Quality signals

**Coverage and complexity pass the regressions that escape**

**Symptom:** escaped regressions that were shared-contract breaks (a dialog input dropped
unless exactly two items were passed; a shared fetch changed to throw) with callers in
many consumer projects; each had green tests and coverage.
**Cause:** per-PR signals measure the diff, not its blast radius.
**Rule:** per PR: a blast-radius report (callers of every changed export across all
consumer projects), a complexity rule that blocks at 20 in pre-push and reports above 10
in a changed-line scorecard, and "Introduced by" recorded on each bug; trends reviewed at
retro. Trap: an ESLint suppressions file applies only through the CLI, not the Node API
that Nx lint uses, and not from a sub-project's cwd; suppressions cover `error` rules only.
CI builds branches, not PRs: find the PR through the API; a posting step needs a scoped
token with PR write, proven from a replay before trusting it.

**A ticket marked Done is not evidence the code landed**

**Symptom:** a ticket Done for a month; its PR was never merged; the next merge-back ran the
slow path the ticket claimed to have fixed.
**Cause:** status transitions come from automation and humans, not from git.
**Rule:** `git grep` the behaviour on `origin/<integration-branch>` before planning on it;
verify "fixed" claims with the build console, not the board.

## Release mechanics

**Read the planner's output before accepting a claim about plan shape**

**Symptom:** a ticket or a colleague says the tool batches or parallelises in a particular way.
**Cause:** the claim came from memory of an older version.
**Rule:** run the planner in dry-run mode and read its console output before deciding whether
the change is needed.

## Unattended work

**Start the return day with a PR walkthrough**

**Symptom:** an engineer returns from an agent-run sprint to a stack of open PRs and a list
of owed live proofs.
**Cause:** agents can neither merge nor trigger real environments by design, so everything
converges on the human's first day back.
**Rule:** open with a walkthrough, one PR at a time: why it was needed, what changed file by
file, how it is proven, what to look at closely, merge prerequisites and the post-merge
proof; pause after each for the human's own approve or merge. Before starting, check each
PR tip with `git ls-remote` against the review pack and flag anything that moved. Record
the merge order; every PR description names only its own ticket key; owed proofs are
listed per ticket in its comments, not in chat.

**A bug-board sweep works only with an opt-in label**

**Symptom:** agents pick up tickets nobody wanted automated, or sit idle while the board
fills.
**Cause:** no explicit opt-in and no parking rule.
**Rule:** one ticket per run, chosen by an opt-in label; assess first and gate on outcome,
reproduction, acceptance criteria and value; park with labels (`needs-clarity`, `stale`,
`needs-human`), transition back to Backlog and unassign; skip CI and pipeline bugs; post
to the team channel at each state change; Step 0 of every run is follow-up on open PRs
before new work; PRs target the current release train, falling back to the newest
future-dated release branch when the integration branch has moved ahead; an E2E gate with
control runs; never arm two schedulers; never add a ticket by hand (the label is the
opt-in). Stage agents have no tracker or git-host tools; the orchestrator applies their
proposed edits and opens the PR.

**Get a positive control before trusting a run of zeros**

**Symptom:** every sample of an executor-occupancy probe reported zero; the job's display
name was not its URL slug, so the matcher never matched.
**Cause:** no sample where the thing being watched was known to be present.
**Rule:** before trusting an absence, capture one sample where the signal is known to be
there. Measure durations from the system's own timestamps rather than periodic sampling,
which misses short windows.

## Dependency hygiene

**`yarn npm audit` is dead on yarn 3; use the registry's bulk endpoint**

**Symptom:** `yarn npm audit --all --recursive` returns `YN0035: Bad Request` from the
quick-audit endpoint.
**Cause:** the registry retired that endpoint.
**Rule:** collect every `resolution: "<name>@npm:<version>"` from `yarn.lock`, POST
`{ "<name>": ["<version>", ...] }` to
`https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`, and keep advisories whose
`vulnerable_versions` matches via `semver.satisfies(v, range, { includePrerelease: true })`.
About thirty lines of Node, no auth, seconds for ~2,000 packages. Run it on
`git show origin/<integration-branch>:yarn.lock` versus the branch for a before/after
table. Never report the errored audit as clean. Treat scanner PRs as signals and
consolidate them into one verified bump; they go stale and cannot update the lockfile
themselves.

## Cloud permissions

**S3 says 404 for a missing object only when you hold `ListBucket`**

**Symptom:** after a least-privilege tightening, every existence check (locks, pointers,
quarantine markers) fails closed with `403 Forbidden`.
**Cause:** `HeadObject` on a missing key returns 404 with `s3:ListBucket` and 403 without it;
a fail-closed store treats 403 as a real error, correctly.
**Rule:** keep `s3:ListBucket` on any role whose code distinguishes missing from error. Do
not weaken the store to treat 403 as absent. Write-only roles need a separate read role
for preflight checks; a conditional create (`--if-none-match '*'`) is the atomic publish.

**The IAM policy simulator is account-local**

**Symptom:** a cross-account allow/deny matrix comes back wrong; one call with several
resource ARNs returns `implicitDeny` for every row, including genuinely allowed ones.
**Cause:** the simulator evaluates principals only in the account you are authenticated to;
with several resources a wildcard statement must cover all of them.
**Rule:** simulate once per account; one resource ARN per call when the expected decisions
differ. `EvalDecision` is authoritative on DENY rows; a permissions-boundary condition can
surface `MissingContextValues` but can only restrict, so enforce
`MissingContextValues == 0` on ALLOW rows only. SSO login pickers need a real TTY: pass
`--role` explicitly and `--force` to defeat a cached session; verify with
`aws sts get-caller-identity`. Env vars do not persist across tool calls: write to the
credentials file's default profile.

## Local harness traps

**Docker bind-mount lag after a git checkout**

**Symptom:** a container run immediately after `git checkout -- <file>` throws
`FileNotFoundException` for a file `git status` says is restored; a mutation harness that
greps for `AssertionError` reports MISSED, so the test looks too weak.
**Cause:** Docker-for-Mac bind-mount visibility lag.
**Rule:** never chain the revert straight into the next container run; run each mutation as
its own command, or assert the file exists and is non-empty inside the container before
trusting a result. Treat "my test suddenly stopped catching things" as a harness hypothesis
first; re-run the single case by hand before weakening an assertion.

## Analytics

**A tag's destination fan-out proves a double send is server-side**

**Symptom:** every analytics event appears twice under two different measurement ids; the
repo loads one id.
**Cause:** a Google tag can carry a server-configured destination list, set in the tag admin
and invisible in the repo.
**Rule:** in the page console, `window.google_tag_data.tidr.container["<id>"].destinations`
is authoritative. Corroborate with three app-side checks before closing the code-side
question:

```js
[...document.querySelectorAll('script[src*="googletagmanager"]')].map(s => s.src)
[...window.dataLayer].filter(a => a[0] === 'config').map(a => a[1])
JSON.stringify(window.dataLayer).includes('<the unexpected id>')   // false = not app-side
```

The fix is in the tag admin, not a PR. Capture hits by wrapping `fetch`, `sendBeacon`, XHR
and `Image.src` before navigating and record only `tid`, `en` and parameter names;
wrapping an already-wrapped `fetch` double-counts, and parameters may travel in the POST
body, so "not observed in the URL" is inconclusive. Related: a destination id that is not
also a tag id 404s on `gtag/js?id=`, so nothing loads and nothing is sent;
`curl -s -o /dev/null -w '%{http_code}' 'https://www.googletagmanager.com/gtag/js?id=<ID>'`
must be 200 before shipping an id, and `window.google_tag_data` missing after a `config`
means the library never ran.

**Analytics evidence from a local dev server**

**Symptom:** analytics tickets wait for a deployed environment to collect DebugView evidence.
**Cause:** unnecessary: every non-production hostname, localhost included, sends to the
development stream.
**Rule:** copy the gitignored auth and feature-flag config into the worktree; serve on the
one port the auth tenant allows; the app never sets `debug_mode`, and
`gtag('config', id, {debug_mode})` does nothing under container-managed config, so patch in
the console after load:

```js
window.__origGtag = window.gtag;
window.gtag = function () {
  const a = [...arguments];
  if (a[0] === 'event') { a[2] = { ...(a[2] || {}), debug_mode: true }; }
  return window.__origGtag.apply(this, a);
};
```

Client-side navigation keeps it; a full reload loses it. The browser extension reports
every collect POST as 503 (cosmetic); the Realtime API proves arrival. Events are batched,
so count in DebugView or Realtime, not in the URL list. Keep runs short if the development
stream fans out to production (previous lesson).

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
