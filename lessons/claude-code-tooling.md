# Claude Code tooling

Lessons about the agent harness itself: tool calls, hooks, mods, permission classifiers,
the shell, MCP servers, artifacts and the browser. Each entry: symptom -> cause -> rule.

## Tool calls and side effects

**An interrupted tool call may already have fired**

**Symptom:** a Bash call reported "rejected / interrupted" started a real CI build anyway,
twice, while the user's own build was saturating the pool.
**Cause:** the call was `curl -X POST ... && while ...; do sleep; done`. The interrupt killed
the wait loop; the POST had already been sent. "Did not proceed" is only true when the
refusal came before the call started.
**Rule:** put outward-facing side effects (build triggers, POSTs, pushes, publishes) in their
own short tool call, separate from any wait or poll loop, so a refusal means nothing fired.
After any interrupted call that contained a side effect, check whether it fired (list the
job's builds with cause and start time; read the artifact's version id) and tell the user.

**A deploy poll must fail loudly and be read**

**Symptom:** two edits reported "live" while the hosting build had actually failed.
**Cause:** the poll script exited 0 on timeout and its output was never read.
**Rule:** polls `exit 1` on timeout; read the output before reporting success; "live" means a
fetched page contains the new string.

**Side effects the classifier blocks: hand them over as one command**

**Symptom:** triggering a CI build, deleting an object in a bucket, retargeting a PR or
listing a credential store is denied in auto mode even though the user asked for it.
**Cause:** the permission classifier treats real-environment actions, deletes and credential
reads as high-risk regardless of intent.
**Rule:** do not route around it. Prepare everything (parameters, the exact URL or command,
the evidence) and hand the user one line to run themselves, then verify the effect
read-only afterwards. Read-only GETs are fine. A cue to the user ("trigger now") is easily
acted on late; give the trigger at the moment it is safe, with the deadline.

## Hooks and mods

**A Read hook that truncates files**

**Symptom:** `Read` returns line 1 plus a nudge to rely on "prior observations"; re-reading
with an offset is refused as a wasted call. Subagents hit it too.
**Cause:** a memory plugin's PreToolUse Read hook intercepts files it holds observations for.
Observation summaries are stale and lossy; implementation and review need exact bytes.
**Rule:** when a read comes back truncated, read via Bash (`cat`, `sed -n`). When dispatching
subagents that must verify file contents, tell them up front that hook-injected "already
confirmed" claims are untrusted and to verify against live files.

**The format hook fires on files outside the repo**

**Symptom:** one `Edit` to a prototype board in the scratchpad quadrupled its line count, and
the publish in the same response shipped the reformatted file.
**Cause:** a PostToolUse Prettier hook keyed on file extension (`.html/.ts/.scss/.json`), not
on path inside the project; the hook runs between the edit and the publish.
**Rule:** scope format hooks to the project directory. For artifact sources (prototype HTML,
canvas JSON, bundled decks) edit with a Python or shell replace that asserts the match
count, not the Edit or Write tools; when a hook note says a file was modified after an
edit, `wc -l` it against the baseline before publishing. Write inline-styled slides with a
shell heredoc so Prettier cannot expand them.

**Surprise denies may come from a user-level mod**

**Symptom:** a command is refused with a reason no project hook produces: a
`git checkout -- <file>` on a dirty file, a non-ASCII write to a pipeline file, a hand-typed
gitlink, a PR merge call.
**Cause:** mods under `~/.claude/mods/<name>/` load in every session through
`env.CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`; their `hooks/register.ts`
registers PreToolUse guards. Edits hot-reload in interactive sessions.
**Rule:** check the mod's `register.ts` before blaming project hooks; remove the env entry to
switch a mod off. Mods' runtime strings must stay free of ticket keys. A guard that checks
literal SHAs skips anything in `$(...)` or `$VAR`; a guard that decodes `\u` escapes in
written content forces non-ASCII test strings to be built from char codes. `skillOverrides`
in the same settings file (`"<skill-name>": "off"`) is where a noisy plugin skill gets
silenced; look there when a skill never fires.

**A CLI allow rule matches the whole command text**

**Symptom:** a read-only CLI command allowed bare is denied as "Data Exfiltration" the moment
`| head` or `2>&1` is appended.
**Cause:** `Bash(<cli> <verb>:*)` allow rules match the full text; any pipe or redirect falls
through to the classifier.
**Rule:** run allowed CLIs bare (agent-mode CLIs already write the full payload to a file);
name read verbs in allow rules, never a group prefix that also covers merge, approve or
decline; `$(cat file)` is not a pipe. Login flows need a real TTY: the user runs them in a
terminal. Writing to `~/.claude/skills` or settings from a session is blocked as
self-modification; hand those to the user.

## Shell quirks that look like tool failures

**zsh parses your arguments**

**Symptom:** `bad substitution` on `git show $B:src/file`; `echo ====x` errors; a variable
named `path` breaks every command after it; `node script $files` runs once with all the
names in one argument; an unquoted `tree=builds[0]` returns garbage.
**Cause:** `$VAR:s` is a zsh modifier, `=cmd` is command expansion, `path` is tied to `$PATH`,
zsh does not word-split unquoted variables, and `[]{}` are globs and brace expansion.
**Rule:** `${B}:path`, never name a variable `path`, pipe lists through `xargs`, quote URLs
or pass `curl -g`.

**Env vars do not persist between tool calls**

**Symptom:** `export AWS_PROFILE=x` in one call; the next call uses the default.
**Cause:** each tool call is a fresh shell.
**Rule:** write state to a file (the credentials file's default profile, a scratchpad file),
not the environment, or put the export and the command in the same call. Install steps
that need a token from the interactive profile run as `zsh -ic '<command>'`.

## MCP servers (tracker, wiki, git host)

**Granular edits only; a full-body page update destroys what you did not read**

**Symptom:** a twelve-section wiki page came back from the MCP starting at section 9; a
full-body update then deleted sections 1 to 8. The page's server-generated excerpt, which
starts where the stored body starts, was the first honest signal.
**Cause:** the MCP's body conversion truncates large pages, and `update` replaces the whole
body.
**Rule:** use node-level edits (`replaceNode` / `insertNodeAfter` by local id, with the
snapshot token and `dryRun` first), or publish new content as a child page. Repair a
half-lost page by restoring the last good version in the UI, then splicing the newer
additions back on top; never plain-restore, because the bad version also carries real new
content. `&amp;` in a title is stored literally; use `&`.

**Editing a ticket description replaces the whole field**

**Symptom:** a two-word change wiped the rest of the description.
**Cause:** the edit call takes the full field.
**Rule:** keep the pre-edit text in context, resend the whole description, re-fetch and diff
afterwards. Markdown bodies must be real Markdown (`##`, fences, `**bold**`), not wiki
markup (`h2.`, `{code}`), which is stored as literal text. A markdown comment silently drops
a bullet whose body holds a nested table: read the echoed body back; use flat bullets or a
top-level table. Setting a parent succeeds but is not echoed; confirm with a search.
A comment edit with an existing comment id updates in place rather than adding a new one.

**Image uploads need a human**

**Symptom:** the two-phase attachment upload stops at phase 1 in auto mode: the shell step
carries a short-lived auth header and the classifier refuses it (and refuses a later
command whose heredoc merely described it).
**Cause:** the upload is a credentialed shell step, not an MCP call.
**Rule:** hand the image files to the user to drag into the ticket or PR; write the prose
about it with the Write tool, not a heredoc.

**Large results are persisted to a file; auth silently drops mid-session**

**Symptom:** a 54 KB PR read returns a file path instead of content; later, "No valid
authentication token" or "Resource not found" despite a valid login; a fresh OAuth re-auth
makes it worse by resetting the active workspace.
**Cause:** tool output limits; the git-host MCP loses its workspace context.
**Rule:** parse the persisted file with `jq` or Python rather than re-calling; re-select the
workspace (not re-auth) and confirm with the auth-status call. When the MCP is logged out,
a vendor CLI with a file-based body (`--body "$(cat file.md)"`) covers comments, PR reads,
status and field updates; its create-PR response echoes the destination for the read-back.

## Artifacts and the browser

**Editing a bundled deck artifact without breaking it**

**Symptom:** adding one slide to a published review deck corrupts it, or the publish "fails"
and the retry makes a duplicate version.
**Cause:** slides live as `<section>` elements inside a JSON-string template
(`<script type="__bundler/template">`); assets are base64 (sometimes gzip) in a manifest;
the artifact `read` returns the publish skeleton around the real document.
**Rule:** strip everything before the first `<!DOCTYPE html>` and the trailing
`</body></html>`; `json.loads` the template; insert the section after its anchor;
re-serialise with `'\n' + json.dumps(tpl, ensure_ascii=False).replace('</', '<\\u002F') + '\n  '`
and assert the untouched round-trip is byte-identical before editing; publish with the
deck's `url`. A publish that errors with a network or SSL failure may still have landed:
read the artifact and compare the version id before retrying. Copy an existing slide's
inline styles. Always list or read before publishing: someone else may have published
between your edits.

**Browser automation traps**

**Symptom:** a 45-second evaluation timeout on a hidden tab; `[BLOCKED: Cookie/query string
data]` instead of a result; a DOM check that passes and a screenshot that disagrees; a
script that silently aborts; clicks that navigate away.
**Cause:** a hidden tab throttles timers and never fires `requestAnimationFrame`; the tool
redacts any returned string that looks like a query string, cookie or token (dotted
hostnames included); polling re-renders between calls; `JSON.stringify` on a circular
object throws; coordinate clicks near a sidebar hit navigation.
**Rule:** prove responsiveness with a synchronous eval, not an rAF probe; return only numbers
and booleans, or text with `https://`, `?=&;%` and dots replaced; set state, read the DOM
and screenshot in the same batch call; avoid serialising framework objects; use element
refs near navigation. `Cannot access a chrome-extension:// URL` recurs on some sites: open
a fresh tab rather than re-navigating. Site permissions are per site in the extension; ask
the user to grant one rather than assuming a site is unreachable.

## Browser storage (application side)

**Quota pruning evicted the auth token first**

**Symptom:** page 2 of a list is silently never requested; nothing in the console.
**Cause:** the session-storage quota handler evicted keys by priority and the auth token,
user state and permissions were lower priority than data caches; with no token the request
interceptor returned a never-completing observable.
**Rule:** make only cache keys evictable (match a prefix such as `db_`), never auth or
permission state; log quota evictions with an always-on warning. A storage shape shared
across independently deployed packages must stay readable by the old reader (a leading
context row, not an envelope, when the parent may deploy first). A per-feature cache
stored under its own key must be included in the shared reset.

## Build configuration

**Nx ignores the second name in `--configuration a,b`**

**Symptom:** `nx build <app> --configuration production,extra` produces output byte-identical to
`production`; the `extra` file replacements never apply; exit 0, no warning.
**Cause:** the Angular CLI merges comma-separated configurations; the Nx executor does not.
**Rule:** make each extra configuration a full copy of the one it extends, with a drift guard
that refuses to build when the copy differs apart from its intended delta. Prove a
configuration took effect by grepping the output for a string only it compiles in.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
