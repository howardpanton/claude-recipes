# Agent-run sprint: smoke tests, claim verification, lessons

Companion to [SKILL.md](SKILL.md).

## Smoke-test the evening before

Test every capability the agents need, then make one subagent run the same checks:
subagents inherit tools but not assumptions.

| Capability | How (read-only or self-cleaning) |
| --- | --- |
| CI read | An authenticated GET of a job's JSON (`curl -sn <ci-url>/job/<name>/lastBuild/api/json` with `~/.netrc`) |
| Tracker read / comment / transition | Fetch one ticket; list its transitions once and record the names agents may use |
| Git host | Auth status; list open PRs on the repo |
| Git push from a worktree | Push a throwaway branch with `git -C <wt> push origin <branch>`, then delete it. If a session hook refuses, see the push rule in SKILL.md |
| Chat | Post to a thread; have a subagent reply in it |
| Build / test baseline | Run the key suite on `<integration-branch>` once; record pass and known-fail counts |
| Cloud CLI | Usually interactive SSO and unavailable unattended; list cloud-only steps as human-owned. If the human logs in mid-session, the credentials last about an hour, so ask again before each cloud step |

## Verify every agent claim

| Claim | Verify with |
| --- | --- |
| PR opened | The host's PR read: destination branch, source tip SHA |
| Diff is scoped | `git diff --stat origin/<base>...origin/<branch>`; no stray gitlinks: `git diff origin/<base>...origin/<branch> \| grep ' 160000 '` |
| Tests pass | Re-run the key spec in a throwaway detached worktree off the remote branch (`git worktree add --detach <tmp> origin/<branch>`), then remove it |
| ASCII, no secrets | `LC_ALL=C git diff origin/<base>...origin/<branch> \| grep -cP '^\+.*[^\x00-\x7F]'`; grep the diff and any build console for `Bearer`, `token=`, URL credentials |
| No force-push | `git merge-base --is-ancestor <old-tip> origin/<branch>` |
| Ticket moved | Fetch the ticket with `status` only |
| Gitlink valid | `git -C <sub> cat-file -t <sha>`, and the SHA is on the submodule remote: `git -C <sub> ls-remote origin \| grep <sha>` |

- Never verify inside an agent's worktree with `git checkout <ref> -- <path>`; it detaches
  HEAD under the agent.
- Capture real exit codes. `cmd | tail` reports the pipe's status, not the command's; that
  masked a build that never ran. Use `set -o pipefail` or check `${PIPESTATUS[0]}`.

## Rules learned from running it

- Watch the trigger events after a merge: a merge-back build can expose a regression; a
  fix is proven when the downstream chain succeeds, not when it merges.
- Treat build logs as public: a hook must fail the build on a token-shaped string
  (`Bearer`, `token=`, URL credentials).
- Pass secrets by file or env, never by argument.
- A write-back step must run on the executor that holds the workspace, or re-fetch.
- Decide the canary window before the run, not during; ask agents to question their own
  plan.
- Always run an independent review agent; a test that does not pin its call site passes
  against the wrong code.
- Build with the workspace runner (`npx nx build <app>`), not the framework CLI directly;
  a fresh worktree needs `node_modules` symlinked or lint "passes" with nothing to lint;
  check the Node minimum with `nvm`.
- A repo still on legacy lint config needs `ESLINT_USE_FLAT_CONFIG=false`; expect any
  pre-existing boundary warnings.
- zsh: `$VAR:l` is a lowercase modifier; write `"${VAR}:path"` in `git show` refs.
- An abort during a deploy's prepare stage can be swallowed and the deploy still applies;
  plan abort-based tests for the deploy having fully run.
- Merging a PR can transition every ticket key its description mentions, or none. Name
  only the PR's own key, and check each ticket by hand after merge.
