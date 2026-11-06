# Claude Code recipes

A portable library of Claude Code skills, subagents, hooks, mods, templates and
hard-won lessons, distilled from daily use on a large Angular monorepo of git
submodules with a Jira, Bitbucket and Jenkins toolchain. Everything here has
been generalised: no company, product, host, ticket or person from the original
repo appears, and every skill ends with an "Adapt to your repo" section naming
the placeholders to fill in.

The index below is ordered by how often each recipe was actually invoked, so the
top of each list is the most battle-tested.

## Layout

| Directory | What it holds |
| --- | --- |
| `skills/` | 20 skills (`<name>/SKILL.md` plus sibling reference files) |
| `agents/` | 10 subagents in Claude Code agent format |
| `hooks/` | Shell hooks, a `settings.json` hooks block, and a test runner |
| `mods/` | Four Claude Code mods (TypeScript plugins that guard tool calls or add status-line panes) |
| `plugins/` | A ready-to-install local marketplace with the `handover` plugin |
| `lessons/` | Symptom, cause, rule entries grouped by topic |
| `memory/` | The persistent-memory discipline and its file template |
| `evals/` | The harness-evals pattern for an autonomous ticket pipeline |
| `instructions/` | Coding and security guideline files for `@`-inclusion from CLAUDE.md |
| `templates/` | Skeleton for a "how this repo runs" knowledge skill; the config, domain and setup skills that `CLAUDE.md.template` routes to follow the same shape |
| `CLAUDE.md.template` | The universal-rules shape for a project CLAUDE.md |

## Install

Project-level (most recipes):

```bash
cp -r skills/* <repo>/.claude/skills/
cp -r agents/* <repo>/.claude/agents/
cp -r hooks/*.sh <repo>/.claude/hooks/        # then merge hooks/settings.hooks.json into <repo>/.claude/settings.json
cp -r instructions <repo>/.claude/
cp CLAUDE.md.template <repo>/CLAUDE.md         # fill in the <placeholders>
```

User-level alternatives: skills also work from `~/.claude/skills/`, and agents
from `~/.claude/agents/`. Once installed, a skill can also be invoked as a slash
command, for example `/start-ticket PROJ-123`.

Mods are enabled by listing their directories in `CLAUDE_CODE_PLUGIN_DIRS` (see
`mods/README.md`). The handover plugin installs from the local marketplace in
`plugins/` (see `plugins/README.md`).

Run the hook tests before trusting a hook in a new repo:

```bash
sh hooks/tests/run.sh
```

## Skills (most used first)

| Skill | Use when |
| --- | --- |
| `pr-review` | Reviewing a PR, branch or diff in a monorepo of submodules; a diff shows a `Subproject commit` line |
| `start-ticket` | Starting a ticket: fetch it, decide scope, plan, then create the worktree and branches |
| `assess-ticket` | Judging whether a ticket is ready to develop and proposing edits back to the tracker |
| `pr-description` | Writing a PR title and body a reviewer understands in thirty seconds |
| `write-ticket` | Raising a ticket a developer or agent can pick up without asking questions |
| `handover` | Ending a session, or resuming from a previous session's handover |
| `ticket-pipeline` | Running a ticket end to end with stage agents (assess, plan, develop, test, review) |
| `change-control` | Deciding how a change is classified, branched, committed, gated and landed |
| `architecture-contract` | Touching load-bearing plumbing; writing down invariants and deliberate weak points |
| `validation-and-qa` | Deciding what counts as evidence that a change works |
| `browser-qa` | Executing a test plan in a real browser and recording evidence |
| `debugging-playbook` | A failure that matches a known mode, or an unknown bug that needs the generic method |
| `design-ticket` | Producing a design from a Design ticket or spike |
| `qa-test-planner` | Writing a release regression plan from the fix version's tickets |
| `performance-experiments` | Proving a performance fix is real; setting and ratifying thresholds |
| `docs-and-writing` | Choosing which doc is the source of truth; authoring and maintaining skills |
| `ux-design` | States, information architecture and copy for any user-facing flow |
| `accessibility` | Colour, contrast, status indicators, focus and ARIA in new or changed UI |
| `agent-run-sprint` | Letting agents carry a sprint's tickets while the engineer is away |
| `tidy-worktrees` | Auditing worktrees for staleness (report only) |

## Agents

| Agent | Role |
| --- | --- |
| `pr-reviewer` | Read-only, submodule-aware PR review using the `pr-review` skill |
| `ticket-assessor`, `ticket-planner`, `ticket-developer`, `ticket-tester`, `ticket-reviewer` | The five pipeline stages; none has tracker or git-host tools (the planner may fetch public docs), the orchestrator owns side effects |
| `repo-navigator` | Ownership map and prior-art finder across a root repo and its submodules |
| `pre-push-reviewer` | Last look at your own staged diff before `git push` |
| `test-writer` | Backfills unit tests so changed files clear the sibling-spec and coverage gate |
| `memory-writer` | Writes the memory file and index line after a finished run |

## Hooks

| Hook | Event | Effect |
| --- | --- | --- |
| `protect-files.sh` | PreToolUse Edit/Write | Blocks edits to secrets, lockfiles and bot-managed config |
| `block-secrets.sh` | PreToolUse Edit/Write | Blocks content matching credential patterns |
| `git-guards.sh` | PreToolUse Bash | Blocks `--no-verify`, pushes to or from protected branches, and accidental submodule-pointer commits |
| `format-on-write.sh` | PostToolUse Edit/Write | Runs the formatter on written source files, never fails the call |
| `telemetry.sh` | Stop, SubagentStop | Appends a token and duration snapshot per run |

## Mods

| Mod | What it does |
| --- | --- |
| `repo-guards` | Verifies gitlink SHAs, refuses reverts that discard uncommitted edits, keeps CI pipeline files ASCII, warns when a push gate ran nothing, denies merge tools, checks where a created PR landed |
| `ticket-context` | Status line and pane showing the ticket behind the current branch and its PRs |
| `context-bar` | Live context-window bar above the prompt |
| `ci-watch` | Status line and pane for CI jobs: latest builds, paused gates, aborted deploys (Jenkins-flavoured) |

## Lessons, memory, evals

- `lessons/` has five files: git and submodules, CI pipelines, Claude Code
  tooling, testing and coverage, process and estimation. Each entry is a bold
  title with Symptom, Cause and Rule.
- `memory/README.md` describes the one-fact-per-file memory discipline with an
  index file, and the end-of-run memory-writer stage.
- `evals/README.md` describes benchmarking an autonomous pipeline against past
  tickets with human-approved outcomes, so a prompt change is measured, not
  demoed.

## Placeholder conventions

`<integration-branch>` (develop or main), `PROJ-123` (example ticket key),
`<org>`, `<repo>`, `<test-cmd>`, `<lint-cmd>`, `<coverage-threshold>` (80% is the
worked example throughout), `<ticket-tracker>` (Jira, GitHub Issues),
`<git-host>` (Bitbucket, GitHub), `<ci>` (Jenkins, GitHub Actions), plus the
ones each skill's Adapt section names (`<release-branch>`, `<deploy-pin-file>`,
`<handover-dir>`, `<qa-label>` and so on). Branches follow
`feature/PROJ-123-short-slug`; ticket commits are `[PROJ-123] message`.

## How this library was checked

- Every file was grepped for the original company, product, host, ticket and
  people names; the library is clean.
- Every `SKILL.md` has a `name` matching its directory and a third-person
  "Use when" description under 500 characters.
- Every agent has frontmatter with `name`, `description` with examples, `tools`
  and `model`.
- The hook test runner passes 34 checks, covering the blocking and allowed case
  of every guard. No file holds a credential-shaped string: the secret-guard
  fixtures use a placeholder that the runner fills at run time.
- The four mods were typechecked at authoring time against the generated Claude
  Code plugin types (not shipped; regenerate them before trusting), and the two
  mods with unit tests pass `claude plugin test`.
- An independent review pass checked for leaks a regex misses, broken
  cross-references and contradictions between recipes, and ran seven retrieval
  scenarios against the library alone.
