---
name: run-and-operate
description: Use when running or deploying <repo> - "how do I run the app locally?", what the local pointing targets mean, mock-server mode, "which CI stages run on my branch?", pipeline parameters, the deploy environments, "how does a release get cut?", where build output lands, commit markers like [skip ci], what the deploy pin file holds, or how to redeploy or roll back an environment.
---

<!--
Skeleton for a "how this repo runs" knowledge skill. Keep the headings; fill every
<placeholder> from the files named in Provenance, never from memory. Delete sections that
do not apply. The Provenance & maintenance section is mandatory.
-->

# Run & Operate

How <repo> runs locally, how CI builds, tests and deploys it, how a release is cut and where
every artefact lands. Every fact below was verified against the files named in Provenance;
line numbers are volatile, the commands are not.

## When NOT to use this

- Feature flags, environment files, session-storage keys -> the `<config-skill>` skill.
- Branching, commit format, submodule bumps -> `change-control`.
- A concrete failure -> `debugging-playbook`.

## 1. Environments

| Name | Purpose | URL | Region / account | Deploys from | Approval |
| --- | --- | --- | --- | --- | --- |
| `dev` (nightly) | every merge to `<integration-branch>` | `<url>` | `<region>` | CI, automatic | none |
| `<env-2>` | <purpose> | `<url>` | `<region>` | manual run | none |
| `staging` | release candidate | `<url>` | `<region>` | manual run | human "Proceed?" |
| `prod-<region>` | <purpose> | `<url>` | `<region>` | manual run | human "Proceed?" + announcement |

## 2. Local run modes

| Mode | Command | Backend | Use when |
| --- | --- | --- | --- |
| Dev server against a deployed env | `<point-cmd> <env> && <start-cmd>` | real | <when> |
| Mock server | `<mock-cmd>` | mocks, deterministic | E2E, demos, no VPN |
| E2E | `<e2e-cmd>` | always mocks | never a live environment |

Traps: <what breaks when you point at the wrong env; what the dev proxy does and does not
intercept; which port the E2E runner kills>.

## 3. Configuration and flags loader

- Where the flag file comes from locally (`<static file>`), in CI (`<store>/<env>/...`) and
  at runtime (`<FlagsService>.loadConfig()` in an app initializer).
- The places that drift and the one-liner that diffs them: `<diff command>`.
- The non-negotiable spelling trap, if you have one (a flag key that must match a historic
  misspelling exactly).

## 4. Pipeline map

One pipeline (`<Jenkinsfile | .github/workflows/<file>.yml>`). Triggers: <push on every
branch; cron on the integration branch>. Two shapes, if applicable: a CI build and a
deployment run, switched by `<parameter>`.

### Stages

| Stage | Defined in | Runs when | What it does |
| --- | --- | --- | --- |
| Prepare | `<file>` | always | builds the CI image; parses the commit subject for markers |
| Build | `<file>` | not `[skip ci]` | <what> |
| Lint | `<file>` | + not `[skip test]` | <what> |
| Unit tests | `<file>` | same | coverage miss -> UNSTABLE, not FAILURE |
| E2E | `<file>` | release and integration branches, or `<param>`, or `[e2e:...]` | <what> |
| Release | `<file>` | integration branch, build SUCCESS | semantic-release |
| Publish | `<file>` | <when> | artefact -> `<store>` |
| Deploy | `<file>` | <when> | infrastructure apply; staging and prod need a human approval |
| post-always | `<file>` | always | archives junit, videos, screenshots |

Dead code to not be confused by: <files that exist but are not loaded; variables nothing reads>.

### Parameters

| Parameter | Default | Effect | Trap |
| --- | --- | --- | --- |
| `<param-run-e2e>` | false | forces the E2E stage on a feature branch | needs `<other-param>` too |
| `<param-env>` | <default> | <effect> | |
| `<param-artifact>` | `''` | documented as "the version to deploy" | ignored: the pin file wins |

### Commit-message controls

Your own token list, e.g. `[skip ci]`, `[skip test]`, `[e2e:all]`, `[e2e:<domain>]`: where
each is parsed, and what each actually skips (a deploy stage can still run under `[skip ci]`).

## 5. Release flow

Merging to `<integration-branch>` is releasing: <semantic-release reads the conventional
commits; which types cut which bump; the `no-release` scope; what the release commit looks
like and why it carries `[skip ci]`>.

## 6. Where output lands

| Artefact | Location |
| --- | --- |
| Build output | `dist/<app>/` |
| Published bundle | `<store>/<repo>_<version>.tar.gz` |
| Source maps | <error-reporting release> |
| Coverage trend | <report> |
| Test results | `results/junit/` |

## 7. The deploy pin file

`<pin-file>`: what it pins per environment, who writes it (the release bot, never a human) and
the hook that blocks hand edits.

## 8. Redeploy and rollback runbook

1. Find the last good version: `<command>`.
2. Set the pin, or choose the parameters: `<how>`.
3. Run the deployment job with `<parameters>`; staging and prod wait for approval.
4. Verify: `<version endpoint or build-version file>`; smoke `<url>`.
5. If the rollback itself aborts: an aborted deploy can still have applied; check the console
   for the apply step before deciding anything.

## Provenance & maintenance

Authored <date> against `<integration-branch>` @ <version>. Sources: <the files read, by
path>. Facts that could NOT be verified from the repo are marked UNVERIFIED inline.

**Keep-current rule:** a PR that changes any fact cited here updates this skill in the same PR.
The PR reviewer treats drift here as blocking.

Re-verify volatile facts before relying on them:

| Fact | Re-verification command |
| --- | --- |
| Stage list and when-conditions | `grep -n "stage('" <pipeline-file>` |
| Pipeline parameters | `grep -n "name: '" <pipeline-file>` |
| Local pointing targets | `grep -n "case '" <point-script>` |
| Which pin the deploy reads | `grep -n <pin-var> <deploy-stage-file>` |
| E2E suite list and marker parsing | `grep -n -A8 '<select-function>' <helpers>` |
| Release plugins and commit assets | `cat .releaserc` |
| Current pins | `cat <pin-file>` |
| Approval gate for staging and prod | `grep -n -B2 -A10 'Proceed' <helpers>` |
| Node version in the CI image | `grep -n node_ <ci-dockerfile>` |

## Adapt to your repo

- Keep the name `run-and-operate` or rename it; rewrite the description with your own trigger
  phrases, third person, starting "Use when".
- Fill every `<placeholder>` from the files, not from memory; delete rows you cannot verify,
  or mark them UNVERIFIED.
- Keep every "Trap" column: those rows are the ones that save a day.
- Delete sections that do not apply (no pin file, no mock server, no approval gate).
- Run every command in the re-verification table once before committing.
