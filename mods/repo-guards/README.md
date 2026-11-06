# repo-guards

Guards for a monorepo of git submodules, run as a mod so they can ask git and read tool
results, which a `settings.json` hook cannot. Edit the config block at the top of
`hooks/register.ts`; nothing else is repo-specific.

| # | Guard | Trigger | Why |
| --- | --- | --- | --- |
| 1 | Gitlink SHA verification | `git update-index --cacheinfo 160000,<sha>,<path>`, and any `git commit` with a staged submodule pointer | A hand-typed SHA with one wrong hex digit is accepted by git and fails every CI build at checkout. Checks: full 40 characters, the submodule is checked out, the commit exists there, and it is reachable from an origin branch (CI fetches only those). |
| 2 | No revert that discards edits | `git checkout <paths>` or `git restore <paths>` over paths with uncommitted changes | A mutation-test loop that reverts with checkout destroys the real change along with the mutation. `restore --staged` and `checkout -b` are allowed. |
| 3 | ASCII-only pipeline files | Write or Edit to a path matching `ASCII_ONLY_PATHS` (Jenkinsfile, `*.groovy`) with any non-ASCII character | The CI agent's JVM is not UTF-8; one em dash fails the pipeline load before any stage runs. The deny names the character, its code point and the line. |
| 4 | A push that proved nothing | A push whose output contains `GATE_SKIPPED_TEXT` | A pre-push hook that found no changed files skipped lint and tests and still exited 0. Appends context telling Claude to run them itself. |
| 5 | Merges are human | `MERGE_PR_TOOL` | The agent opens the PR and hands over the link; a human merges. |
| 6 | PR landed elsewhere, or already existed | the `CREATE_PR_TOOL` result | The requested destination is not authoritative (a host may fall back to the default branch), and an existing open PR with the same source and destination comes back as if new. Compares the landed destination with `DESTINATION_ARG` and the creation time with `EXISTING_PR_MINUTES`. |

Guards 1 and 2 resolve the directory a command's git runs in from a leading `cd X &&` or
`git -C X`, else the session cwd.

## Config

```ts
const ASCII_ONLY_PATHS = /(\.groovy|(^|\/)Jenkinsfile[^/]*)$/;
const GATE_SKIPPED_TEXT = "No changes detected in branch diff"; // what your pre-push hook prints
const MERGE_PR_TOOL: McpToolName = "mcp__bitbucket__merge_pull_request";
const CREATE_PR_TOOL: McpToolName = "mcp__bitbucket__create_pull_request";
const DESTINATION_ARG = "destinationBranch"; // "base" for the GitHub MCP
const EXISTING_PR_MINUTES = 10;
```

Guard 6 reads both the Bitbucket (`id`, `created_on`, `destination.branch.name`) and the
GitHub (`number`, `created_at`, `base.ref`) response shapes.

## Trying it

There are no unit tests: every guard needs real git state. Smoke it in a scratch repo with a
submodule: stage the pointer and ask Claude to commit (guard 1 verifies the SHA); edit a file
and ask for `git checkout -- <file>` (guard 2 denies); write an em dash into a `Jenkinsfile`
(guard 3 denies). Typecheck with `npx tsc -p tsconfig.json --noEmit` after regenerating the
type roots (see `../README.md`).
