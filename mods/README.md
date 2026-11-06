# Mods

A mod is a Claude Code plugin that changes Claude's own interface or behaviour: it denies or
rewrites tool calls, appends context to a tool result, draws a status line, a band above the
prompt or a pane, and registers slash commands. Where a `settings.json` hook is a shell script
that sees one event's JSON, a mod is TypeScript that sees the engine: git via `$.process.run`,
the file system via `$.fs`, MCP servers via `$.mcp.call`, session usage, a clock and the UI.

## Shape

```
<name>/
  .claude-plugin/plugin.json      name, version, description, optional "types"
  .claude-plugin/types/           generated type roots (not shipped; see below)
  hooks/hooks.json                { "modules": ["./register.ts"] }
  hooks/register.ts(x)            export const register: Register = (on) => { ... }
  types/index.d.ts                the mod's own types + its PluginState slot (stateful mods)
  tsconfig.json                   extends ./.claude-plugin/types/tsconfig.json
```

`hooks.json` names the modules the engine loads. Each exports `register`, which subscribes
to events with `on(event, filter?, handler)`:

```ts
on("tool.call", { tool: "Bash" }, async ($, e, next) => {
  if (/--no-verify/.test(e.command)) return { deny: "The gate is there to be run." };
  const ran = await next(e); // run the tool (or the next hook)
  return { ...ran, context: [...(ran.context ?? []), "A note for Claude."] };
});
```

- Return `{ deny: reason }` before `next(e)` to block; the reason reaches Claude.
- Call `next(e)` to let the call through, then inspect or annotate the result (`ran.text`,
  `ran.context`, `ran.isError`).
- `e` is discriminated by `e.tool`: `e.command` for Bash, `e.file_path` and `e.content` for
  Write, `e.new_string` for Edit. MCP tools are `mcp__<server>__<tool>` with loose arguments
  until the type roots declare them.

UI surfaces, from a `.tsx` module:

- `$.ui.status(text)` sets the status line; `$.ui.toast(text, { timeoutMs })` shows a
  transient line.
- A pane: `$.command.register({ name, description })` on `session.start`, `$.ui.open({ id,
  title })` in `command.run`, and `on("ui.render", { component: "Pane", requestId: id }, ...)`
  returning JSX built from `const { Box, Text, Link, Button } = $.ui.resolve(e)`.
- A band above the prompt: `on("ui.render", { component: "AbovePrompt" }, ...)`.
- State: `atom({ plugin, key }, initial)` with `read($, a)` and `update($, a, fn)`; declare
  the slot in `types/index.d.ts` by merging into `PluginState`.
- Timers: `$.clock.every(ms, fn)`; `$.clock.now()` is a mockable clock.

The hook runtime is an ES-module sandbox: no Node, no DOM, no `require`, no dynamic
`import()`; every file is loaded with a static `import` from inside the plugin folder.

## Enabling

Local mods load from the folders named in `CLAUDE_CODE_PLUGIN_DIRS`, colon-separated, set in
the `env` block of `~/.claude/settings.json`:

```json
"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/repo-guards:~/.claude/mods/ticket-context" }
```

Restart the session. Mods run beneath `settings.json` hooks: a shell hook that blocks a call
blocks it before any mod sees it.

## Types, typecheck, tests

`.claude-plugin/types/claude-code*/index.d.ts` are generated (hundreds of KB) and are not in
this library; `.claude-plugin/types/.gitignore` keeps them out of git. Regenerate them with Claude
Code's built-in `plugin-authoring` skill: it writes the type roots for the engine, the built-in tools and the
MCP tools of the servers connected at the time (so `e.tool === "mcp__..."` narrows to real
arguments). Until they exist, `tsc` reports `Cannot find type definition file for 'claude-code'`.

```sh
cd mods/<name> && npx tsc -p tsconfig.json --noEmit   # typecheck (TypeScript from any node_modules on PATH)
claude plugin test mods/<name>                        # runs hooks/*.test.ts(x) with the claude-code/testing kit
```

Test files import `{ test, expect } from "claude-code/testing"`. Keep the testable logic in
pure modules (`parse.ts`, `format.ts`) with no engine calls, and test those.

## Index

| Mod | What it does | Config |
| --- | --- | --- |
| `repo-guards/` | Six guards on git and git-host MCP calls for a monorepo of submodules: verified gitlink SHAs, no reverts that discard edits, ASCII-only CI pipeline files, "a push whose gate ran nothing proves nothing", merges stay human, PR destination and age checks. | top of `hooks/register.ts`: pipeline path regex, gate-skipped text, merge and create PR tool names, destination argument |
| `ticket-context/` | Status line + `/ticket` pane: the Jira ticket or GitHub issue behind the current branch, the branch, its linked worktree, and related PRs (Bitbucket via MCP, GitHub via `gh`). Tracker-agnostic. | top of `hooks/register.tsx`: Jira site and MCP server names; `JIRA_PROJECTS` in `hooks/parse.ts` |
| `context-bar/` | A band above the prompt: context-window fill bar with the auto-compact marker, tokens left, cost and rate-limit windows; one toast on the way into the red. | none |
| `ci-watch/` | Status line + `/ci` pane for CI jobs: the latest build per job, paused approval gates, finished-build toasts, and a warning that an ABORTED deploy may still have applied. Jenkins-flavoured: it reads the Jenkins REST and Pipeline Stage View APIs; another CI needs a new `fetchRun`. | top of `hooks/register.tsx`: host, job paths, deploy labels, poll interval, curl auth |

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
