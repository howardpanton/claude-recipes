# CI pipelines

Lessons from Jenkins declarative pipelines with shared Groovy stage scripts, a
release-promotion engine driven by `build()` dispatches, and per-environment deploys. Most
transfer to any CI whose pipeline code is interpreted at runtime inside a sandbox. Each
entry: symptom -> cause -> rule.

## Pipeline Groovy

**Pipeline files must be pure ASCII when the agent JVM is not UTF-8**

**Symptom:** a build dies before the first stage with
`java.nio.charset.MalformedInputException: Input length = 1` on `load()`. A second shape:
`archiveArtifacts` throws `InvalidPathException: Malformed input or input contains
unmappable characters` and the E2E stage goes red with zero failing tests, because a test
title containing an arrow named a screenshot.
**Cause:** the agent JVM's default charset and filename encoding are not UTF-8. An em dash in
a comment is enough.
**Rule:** `LC_ALL=C grep -nP '[^\x00-\x7F]' <files>` must print nothing for every
pipeline-loaded file (`Jenkinsfile*`, `jenkins/**/*.groovy`); ASCII test titles, or rename
screenshots in an `after:screenshot` hook. Root fix: start the agent JVM with
`-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8`. A PreToolUse hook that denies non-ASCII
writes to those files pays for itself. Markdown is unaffected.

**Cross-object calls into `@NonCPS` helpers fail only at runtime**

**Symptom:** `NoSuchMethodError: No such DSL method 'foo' found among steps [...]` when the
Jenkinsfile calls `helper.foo(...)` on a `load()`-ed script. Offline harnesses pass.
**Cause:** a `@NonCPS` method, or a CPS method that calls a same-script `@NonCPS` helper,
invoked cross-object inside CPS argument evaluation. Same-object (bare) calls are fine.
**Rule:** helpers called cross-object must be plain CPS methods that call Pipeline steps.
Removing `@NonCPS` does not change output bytes (verify a pinned digest). Treat reviewed
pipeline Groovy as unverified until a live build has executed it.

**Script-level `def CONST` is invisible to methods**

**Symptom:** `MissingPropertyException` on the first call of a method in a loaded script; the
file parses clean.
**Cause:** a top-level `def X = [...]` is a local of the implicit `run()`; methods in the same
script cannot see it.
**Rule:** annotate shared constants `@groovy.transform.Field` or move literals into methods.
Verify with a runtime check, not a parse:
`docker run --rm -v "$PWD":/w -w /w groovy:4-jdk17 groovy -cp <dir-with-stub> <check>.groovy`
where the check does `new GroovyShell().parse(file)` and calls one method touching each
constant. The stub is a `@Retention(RUNTIME) @interface NonCPS {}` on the classpath, so
real pipeline files load without stripping annotations. A fake `script` object (echo, build,
error, readJSON as plain methods, dispatches recorded to a list) exercises a whole stage.

**The 64 KB CPS method cap is hit by declarative stages, not file size**

**Symptom:** `MethodTooLargeException: WorkflowScript.___cps___N` at pipeline startup after
adding one stage (about 2 KB of source). Parse, brace and byte-count checks pass.
**Cause:** the JVM per-method bytecode limit applies to the CPS-transformed `pipeline {}`
closure; `when { allOf { ... } anyOf { ... } }` blocks are the expensive part.
**Rule:** add behaviour inside `load()`-ed stage scripts (each method is its own CPS method);
they can `load()` and call other stage scripts. Never add a declarative stage without a
branch build proving it compiles; if one is truly needed, remove or merge an existing one
first.

**Sandbox rejections appear only in a live build**

**Symptom:** `RejectedAccessException` or `Scripts not permitted to use staticMethod ...`
mid-run. Unit tests under plain Groovy pass.
**Cause:** the script-security whitelist. Proven rejections: `new LinkedHashMap(map)`,
`Collection.sum(Closure)`, the dynamic subscript `env[KEY] = v`. Also: `readJSON` nulls are
`JSONNull` objects that make `JsonOutput` recurse to a stack overflow, and a class-filtered
`getBuildCauses('...UpstreamCause')` misses the `BuildUpstreamCause` subclass a `build()`
step produces.
**Rule:** prefer `[:]`, `map + map`, `map[key] = v`, explicit for-loops over
`DefaultGroovyMethods` closures (`sum`, `inject`, `collectEntries`), and literal
`env.NAME = v`. Read `getBuildCauses()` unfiltered and match `_class` against an allow-list.
Only a live build proves whitelist compliance; budget one.

**A silent stage death with the trace after "End of Pipeline"**

**Symptom:** a stage ends with no inline error; the stack trace appears only after the
pipeline finishes.
**Cause:** the exception was thrown outside any step, for example a missing DSL method from a
plugin that is not installed.
**Rule:** grep the console tail, not the stage block. Confirm plugin steps exist on the
controller before depending on them (`lock()` is a plugin, not core).

**Parallel branches sharing fixed workspace filenames corrupt each other**

**Symptom:** phantom failures in parallel branches; an existence check fails with an empty
error detail; worst case, branch A's staged content uploads under branch B's key.
**Cause:** helpers stage content through fixed local filenames in the shared workspace, and
`2> file` truncates at process start, so siblings clobber each other's stderr and payloads.
**Rule:** the discriminator in a staged filename must come from what makes the callers differ
(module, build), not from what they operate on (a shared key): same-key callers collapse to
one name. Better, use `returnStdout: true` or a per-call temp dir. A static scan that only
asserts "the filename interpolates something" proves interpolation, not uniqueness.

## Dispatch and parameters

**An omitted `build()` parameter inherits the downstream default**

**Symptom:** a dispatch passes validation for one target by coincidence and fails closed for
another; a choice parameter rejects `''` at dispatch.
**Cause:** `build(job:, parameters:)` fills omitted parameters with the downstream job's
defaults, not empty; choice parameters refuse an empty string, so server-side "or empty"
handling is unreachable. New parameters register only after one build has compiled with
them, so `buildWithParameters` silently drops them until then.
**Rule:** enumerate the downstream job's definitions
(`<job>/api/json?tree=property[parameterDefinitions[name,type,defaultParameterValue[value],choices]]`)
and pass every validated parameter explicitly. Expect one throwaway build after adding
parameters. A multibranch job does not auto-index a new branch: trigger a scan, and expect
the indexing build to fail on empty parameters (benign noise; say so).

**Internal action values are not workflow choices, and the default is the dangerous one**

**Symptom:** a scripted trigger with a typo'd or omitted workflow parameter silently runs the
default workflow, which is a real promotion.
**Cause:** the engine's internal action names look like valid choices, and the most
consequential workflow was the parameter default.
**Rule:** always pass the workflow explicitly; read the choices from the job config or copy a
proven run's parameters; make the dangerous workflow a non-default choice; reject a blank
change reason before dispatching anything.

**Prove an approval boundary with a Replay probe, not a real release**

**Symptom:** you need to know whether a group resolves as an `input()` submitter (or
whether a given user can approve) and the only pipeline with that gate is blocked upstream.
**Cause:** the security realm's group resolution is invisible until a real gate opens.
**Rule:** on the job's branch, use Replay and replace the whole script with a minimal
pipeline whose one stage does
`timeout(time: 20, unit: 'MINUTES') { input(id: 'p', submitter: '<group-a>,<group-b>', submitterParameter: 'submitter', message: '...') }`
and echoes the result. A working Approve button for the target user, and their id in the
echo, is the proof. Triggering is the human's click when the classifier blocks it.

**`pendingInputActions` detects a paused gate**

**Symptom:** you need to know whether a build is waiting on a human without opening it.
**Cause:** the UI hides the state behind a page.
**Rule:** `curl -sn <run>/wfapi/pendingInputActions` returns the gate id and message when
paused. It is the basis of a poll-then-notify approval workflow.

**Agent loss is an immediate `IOException`, not a timeout**

**Symptom:** a step dies at once with `Unable to create live FilePath for ...`,
`Backing channel ... is disconnected` or `ChannelClosedException`; a `timeout` or an operator
abort throws `FlowInterruptedException` instead.
**Cause:** `FlowInterruptedException` extends `InterruptedException`; a dead agent channel is
an `IOException`. Re-acquisition in the same stage prefers the same (dead) agent through the
consistent-hash affinity key.
**Rule:** `catch (InterruptedException)` for abort and timeout logic; treat any other
exception from a step that cannot fail on a healthy agent (`sh 'true'`) as an agent fault
and retry on a fresh node. Test fakes of `FlowInterruptedException` must extend
`InterruptedException`, or a narrowed catch passes tests and fails live.

## Aborts, notifications and gates

**A failed notification aborted an approved deploy**

**Symptom:** a deployment aborts one second after a human approved it; the console shows
`Aborting deployment to <env>` and a stack trace naming the chat plugin.
**Cause:** `slackSend(blocks:)` sat inside the `try` guarding the approval gate and the
`catch` rethrew; a missing JSON class on the controller then killed every deploy on every
environment until an admin redeployed the plugin.
**Rule:** notifications are non-fatal: own `try/catch`, log and continue. When a deploy aborts
right after approval, grep for the abort line and read the trace before suspecting the
change under deploy.

**Never read ABORTED as "nothing deployed"**

**Symptom:** a red ABORTED badge, yet `terraform apply` ran and the environment changed.
Aborting an E2E stage needed five `/stop` requests.
**Cause:** a `catch (Exception)` treated the interrupt as a cache miss and carried on;
`catchError` swallows aborts by default (`catchInterruptions: true`) per batch, so each stop
killed one batch and the next started.
**Rule:** `if (e instanceof InterruptedException) throw e` in every broad catch (sandbox-safe,
no plugin class); `catchError(catchInterruptions: false)` around batches. After any abort,
check the deploy console or the environment's metadata for what actually applied. Use
graceful `/stop` repeatedly, not `/term`, which skips container cleanup.

**Advisory test failures mark a build UNSTABLE by design; do not widen the gate**

**Symptom:** every production plan fails with "source deployment is unhealthy" although only
an advisory suite failed. Elsewhere, wave builds finish UNSTABLE while their report says
clean.
**Cause:** suites outside the blocking set go `unstable()` and never FAILURE; the soak gate
accepts only SUCCESS; the smoke runs only for production plans, so it went unnoticed for
months. Wave stages are UNSTABLE by design and the report artifact is the truth.
**Rule:** gate on an explicit blocking set (`SUITES == BLOCKING_SUITES`, pinned by a contract).
Never "fix" it by accepting UNSTABLE in the gate. For by-design UNSTABLE stages read the
report file, not the badge. Skipping a test stage to save time also removes the completion
evidence a later publish step requires; the only safe time-saver is skipping the release
cut.

**`[skip ci]` must never gate a deploy or a timer**

**Symptom:** an engine-dispatched deploy runs green with the deploy stage `NOT_EXECUTED`, then
runtime verification fails and the environment is quarantined. After a release, the daily
timer build skips every stage and the integration environment goes dormant.
**Cause:** stage `when` clauses read the HEAD commit message, the release tool's own
`[skip ci]` commit sits at HEAD, and the clauses applied it to upstream and timer causes too.
**Rule:** gate deploy stages on explicit parameters and causes (`runDeployment`,
`UpstreamCause`, `TimerTriggerCause`), never on the commit message. Signature of the bug: a
green deploy-shaped build with the deploy stage not executed. Merge with a non-skip title
when the merge itself must build.

**Credentials are scoped per folder, and sibling folders do not inherit**

**Symptom:** a stage resolves a credential on the build job but silently no-ops on the deploy
job; the `withCredentials` failure was caught and logged as WARNING, so nothing went red.
**Cause:** two sibling folder-scoped stores kept identical by provisioning; a credential added
by hand to one of them drifts.
**Rule:** add a credential to every folder store that runs the stage, after checking whether
provisioning owns the store. List what a job can see with
`<job>/credentials/store/folder/domain/_/api/json?tree=credentials[id,typeName,description]`
(ids only). Credential listings may be classifier-blocked for an agent; ask the admin.

## Executors and workspaces

**Long waits must not hold an executor**

**Symptom:** a four-executor pool exhausted by two release chains; a six-hour approval gate
holding an agent the whole time.
**Cause:** a pipeline-level `agent` holds the executor through controller-side steps that need
no workspace: `input()`, `sleep()`, `build(wait: true)`, `echo`, `slackSend`. Only `load()`,
`sh`, `readFile`, `writeFile` and `readJSON` need a node.
**Rule:** `agent none` at pipeline level; own a node only for stages that do workspace work;
a nodeless approval gate; `post { always }` in its own node (outside an agent it has no
workspace, so a report or notification written there is silently lost). A pure loaded
module (no `sh` or `readFile`) lives in CPS state on the controller and can be called
off-node. Measure holds from the console's `[Pipeline] node` timestamps, not sampled
executor views, and get a positive control before trusting a run of zeros. Executor pools
can be elastic: the provisioned count is a ceiling, not a floor.

**Any node that needs a bootstrapped tool bootstraps for itself**

**Symptom:** after releasing and re-acquiring an executor, `PATH` points at a tool installed
in the previous node's workspace; the fallback system tool lacks the flag and the operation
fails mid-mutation with a lock held.
**Cause:** `env.PATH` is build-scoped, workspaces are per node, and the two nodes happened to
share a path during testing, which masked the bug twice.
**Rule:** bootstrap inside every `node()` that does the work, idempotently (strip other nodes'
entries, skip the download when the pinned version is present, always run the fail-closed
check). A nested `node()` must restore the outer node's `PATH` in a `finally`. A same-agent
canary proves nothing: the test must error when both nodes land on one agent.

**A frozen commit turning red is an agent-image change**

**Symptom:** a commit that built fine for months fails with dependency-scan, container
manifest or missing-distribution errors; no application change; nothing to revert.
**Cause:** the builds moved to a new agent image generation.
**Rule:** check which agent generation the build ran on (`Running on ...` in the log) before
hunting a code regression; pin the known-good agent variant and move to a real tag once
settled.

**Know the shared environment's teardown window**

**Symptom:** a scheduled deploy or test fails at the same time every week.
**Cause:** shared infrastructure is torn down on a schedule to save cost.
**Rule:** check the teardown calendar before reading a scheduled failure as drift, and exclude
those windows from alerting.

## Promotion and environment state

**No same-release skip on promotion**

**Symptom:** promoting a release the target already serves still plans, requires approval
and runs a full deploy.
**Cause:** no "already there" check exists on the promote path.
**Rule:** expect a real deploy (useful for abort and restore drills). A restore drill on an
identical release cannot show a visible change; promote a newer version one hop first if
the proof needs one.

**A stale environment pointer drags a merged module backwards**

**Symptom:** after a merge-back, builds check out a module at an old, even broken, commit;
later the release activation fails with an invalid row for that module.
**Cause:** the environment's per-module version pointer still named an artifact from a
diverged, never-merged branch. The forward-only guard protected ancestor pointers only, and
shallow CI clones make ancestry undecidable, so the override won. Deleting the stale pointer
alone left the module with no pointer, which failed differently.
**Rule:** treat diverged or undecidable pointers as absent (a merged gitlink is never moved
backwards). The complete fix is delete the stale pointer AND re-establish it (publish the
module, promote). Sweep for pointer versions whose suffix is not the integration branch.
Ancestry fallback for shallow clones: the pointer counts as behind when it was a previously
recorded gitlink in the parent's history, read with `git log --full-history -- <sub>`
(default history simplification prunes those commits after a merge-back).

**A new dist file silently never reaches the CDN**

**Symptom:** a freshly produced asset is in `dist/` but 404s on the deployed site; terraform
plans "0 to add".
**Cause:** the deploy uploads only paths listed in the packaging manifest; overlay files only
ship because they overwrite paths already listed.
**Rule:** register every newly written path in the manifest before the deploy stage; when an
asset never reaches the CDN, check the manifest first.

**A release-cutting step overwrote the build marker**

**Symptom:** the deployed version file carries only `version`; the record-deployment step
fails closed; the metadata file is destroyed on the next deploy.
**Cause:** the release tool's prepare command rewrote the dist marker as `{version}`,
stripping the identity fields a later stage had added; masked for years by a second build
that always followed.
**Rule:** merge into existing marker files, never overwrite; keep the source-controlled copy
version-only if the release tool commits it. Diagnosis shortcut: the marker has only
`version` and the metadata URL returns `index.html`, so check whether that build cut a
release.

**Layered environment drift presents as three unrelated bugs**

**Symptom:** pointer mismatch, then runtime mismatch, then marker mismatch, each error only
evaluable once the layer beneath it is fixed.
**Cause:** someone reverted an environment pointer by hand without redeploying the runtime.
**Rule:** never hand-edit environment state in the store; use the engine. Recovery order:
redeploy the runtime the pointer names (with an expected-version assertion), then re-record
the deployment, then re-drive the blocked operation. A record the restore path can never
close is cleaned up by the next operation's supersession at execute time, not at plan time.

**An eligibility rule that lives in three places**

**Symptom:** a branch-eligibility fix lands in the engine and the classifier, and a third
validator still rejects.
**Cause:** the same policy duplicated in engine policy, build-scope classifier and deploy-lane
validator; and a prefix allow-list (`feature/*`, `release/*`) in a team with no enforced
prefix convention.
**Rule:** grep for every copy and change them together; prefer a deny-list of protected
branches over a prefix allow-list. A branch runs its own branch's pipeline code: a branch
cut before a pipeline fix must merge `<integration-branch>` in first.

**Remove the hard-coded branch heuristic when the test is over**

**Symptom:** every plain branch build silently mis-scoped for months; the final fallback
pointed at a spike branch that no longer existed.
**Cause:** per-branch base-ref heuristics added for a verification exercise were left in
build-scope code and rotted into load-bearing behaviour.
**Rule:** removal is part of the same ticket's definition of done. Prefer an explicit override
(an env var or parameter such as `BUILD_SCOPE_BASE_REF`) over branch-name matching; when
touching scope code, hunt stale branch references.

**Read the function that emits the message before proposing a fix**

**Symptom:** two confident wrong fixes in a day, "merge the submodule back" and "allow tests
to fail", both suggested from log wording.
**Cause:** the message described the decision; the function that made it had other inputs
(shallow-clone ancestry fallback; UNSTABLE still skips promotion; a skipped unit stage
withholds publication).
**Rule:** when a pipeline message explains a decision, read the emitting function before
proposing anything. Replay the check locally both the way the pipeline does it and the way
that is correct; a faithful replay reproduces the bug instead of exposing it.

## Reading CI

**No ticket keys in runtime output**

**Symptom:** a log line reads `WARNING: PROJ-123 notification failed`; a reviewer rejects it.
**Cause:** the pipeline outlives the ticket; the key is noise to the next reader.
**Rule:** runtime strings (echo, warnings, chat messages, build descriptions, error text)
describe the behaviour, never the ticket. The code-side rule is in
[testing-and-coverage.md](testing-and-coverage.md).

**Signed static artifact URLs are curl-able**

**Symptom:** fetching an artifact through the API yields a 0-byte file or a 404 HTML page;
page readers choke on JSON viewers; `tree=builds[...]` returns non-JSON that looks like an
auth failure.
**Cause:** artifact URLs 302 to a signed static host, and the token covers the whole build's
artifact root; the shell mangles `[]{}` in unquoted URLs; some API responses carry raw
control characters.
**Rule:** `curl -snL` (follow redirects); with one signed URL in hand, swap the path suffix
for sibling artifacts. Quote `tree=` URLs or pass `-g`; pipe through `tr -d '\000-\037'`
before `jq`. `wfapi/describe` for stage status and durations, `consoleText` grepped locally
for evidence; `wfapi/log` on a stage node returns nothing. Branch job names in URLs are
double-encoded (`release%252F...`).

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
