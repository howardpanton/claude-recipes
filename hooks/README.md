# Hooks

Shell guards Claude Code runs around tool calls. Each script is one concern, reads the hook
event as JSON on stdin, and answers with an exit code:

| Exit | Meaning | What happens |
| --- | --- | --- |
| `0` | allow | nothing visible (stdout appears only in verbose mode) |
| `2` | **block** the tool call | stderr goes back to Claude as the reason; it adjusts and retries |
| other | hook error, the call still runs | stderr is shown to the user only |

Only `PreToolUse` can block. `PostToolUse`, `Stop` and `SubagentStop` hooks observe; exit 2
there feeds stderr back to Claude but cannot undo what already happened.

## The scripts

| Script | Event / matcher | Blocks | Why it exists |
| --- | --- | --- | --- |
| `protect-files.sh` | PreToolUse `Edit\|Write\|MultiEdit` | edits to `.env*`, lockfiles, and the bot-owned files you list | a hand-edited lockfile or bot file is an unreviewable diff and a conflict on the next bot run |
| `block-secrets.sh` | PreToolUse `Edit\|Write\|MultiEdit` | content matching AWS, PEM, Slack, GitHub, Anthropic or Google credential patterns | a key in git history must be rotated, and every clone it reached must be found |
| `git-guards.sh` | PreToolUse `Bash` | `git push --no-verify`; a push from or to a protected branch; a commit that stages (or would stage, via `add -A` / `commit -a`) a submodule pointer unless the message says `bump` or `submodule` | the gate exists to be run; protected branches take PRs only; a silently moved pointer is a regression no test catches |
| `format-on-write.sh` | PostToolUse `Edit\|Write\|MultiEdit` | nothing (always exit 0); runs the formatter on written source files | hand formatting fails the lint gate at push and buries the change in whitespace |
| `telemetry.sh` | Stop, SubagentStop | nothing; appends one JSON line per event to `.claude/telemetry/agent-runs.jsonl` | a per-session token and duration record for cost and agent-run reporting |

Each script has a config block at the top (`PROTECTED_FILES`, `PATTERNS`, `PROTECTED_BRANCHES`,
`FORMAT_CMD`, `FORMAT_EXTENSIONS`). The same names can be set in the `env` block of
`settings.json` instead, so the scripts stay unedited. The `PROTECTED_BRANCHES` default in
`git-guards.sh` (`main master develop`) must be edited to match your `<integration-branch>`
and `<release-branch>`.

### git-guards.sh: where the command runs

A Bash command's git runs in the session cwd unless the command starts with `cd X &&` or uses
`git -C X`. The script resolves that directory before asking git for the current branch and
the staged changes, so `cd ../other-worktree && git push` is judged by the other worktree's
branch. `~` is expanded; quotes are stripped.

### telemetry.sh: what a line holds

`{ts, event, session, agent, model, turns, input_tokens, output_tokens, cache_read_tokens,
cache_creation_tokens, duration_s}`. The numbers are cumulative for the transcript at event
time: take the max (or the diff) per `session`. Cost is deliberately not computed: record
model and tokens, price them at render time, so a stale price table can never poison the log.
Git-ignore `.claude/telemetry/`.

## Wiring

1. Copy the scripts to `.claude/hooks/` in the repo and `chmod +x` them.
2. Merge `settings.hooks.json` into `.claude/settings.json` (project scope, committed) or
   `.claude/settings.local.json` (personal). The commands reference the scripts as
   `sh "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/<script>.sh"`: Claude Code sets
   `CLAUDE_PROJECT_DIR` to the project root, so the hooks work from any cwd, including linked
   worktrees.
3. `jq` must be on PATH.
4. Start a new session: hooks are read at start-up.

Hooks in `settings.json` and mods (`../mods/`) both apply; a hook blocks before a mod sees the
call. Keep the two complementary: hooks for cheap text checks, mods when you need git state,
the tool result, or the UI.

## Testing

```sh
sh hooks/tests/run.sh
```

The runner feeds each fixture in `tests/fixtures/*.json` (plus a few inline events) to the
scripts and asserts the exit code, for both the blocking and the allowed case of every guard.
The git guards run against throwaway repos it creates under a temp dir (one with a submodule
whose pointer has moved), so no real repo is touched. It prints `N passed, M failed` and exits
non-zero on any failure.

To try a script by hand:

```sh
echo '{"tool_input":{"file_path":"/x/.env"}}' | sh .claude/hooks/protect-files.sh; echo "exit $?"
```

Add a fixture by copying the nearest one. The event shape is `{hook_event_name, tool_name,
tool_input}` with `tool_input.file_path` + `content` (Write), `old_string` + `new_string`
(Edit), `edits[]` (MultiEdit), or `command` (Bash); Stop events carry `transcript_path`.

Fixtures for `block-secrets.sh` hold the placeholder `@@SECRET@@` where the credential goes;
the runner assembles a token-shaped value at run time and splices it in. Keep it that way:
a literal key or token in a fixture, even a fake one, is a secret to every scanner and to the
git host's push protection, and it stays in history after you delete it.

## Global settings patterns (`~/.claude/settings.json`)

Things that live in the user file, not the repo, because they are about your machine:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/repo-guards:~/.claude/mods/ticket-context:~/.claude/mods/context-bar:~/.claude/mods/ci-watch"
  },
  "skillOverrides": {
    "some-marketplace-skill": "off",
    "another-noisy-skill": "off"
  },
  "statusLine": {
    "type": "command",
    "command": "bash \"$HOME/.claude/statusline.sh\""
  },
  "permissions": { "defaultMode": "acceptEdits" }
}
```

- `CLAUDE_CODE_PLUGIN_DIRS`: colon-separated folders of local mods to load (`../mods/README.md`).
- `skillOverrides`: switch off third-party skills whose trigger descriptions fire on every
  prompt ("use when debugging", "use before any creative work"). An installed plugin's skills
  stay listed in the system prompt and compete with your repo's own; `off` removes them
  without uninstalling the plugin.
- `statusLine`: a command whose stdout is the status line; it receives the session JSON on
  stdin (model, cwd, context figures). Mods can also set it with `$.ui.status`.
- `permissions.defaultMode`: `default` (ask), `acceptEdits` (file edits without prompts,
  commands still ask), `plan` (read-only until you approve a plan), or `auto` where available
  (a classifier approves routine actions). Pick per machine; the repo's hooks apply in every mode.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
