# Git and submodules

Lessons from a parent repo whose feature projects are git submodules, each with its own
remote, PRs and release branches. `<integration-branch>` is develop or main; `<sub>` is a
submodule path such as `apps/billing`; `PROJ-123` is the example ticket key.

## Submodule pointers (gitlinks)

**A hand-typed gitlink SHA breaks every build of the branch**

**Symptom:** every CI build of the branch fails at checkout, before any stage runs, with
`fatal: remote error: upload-pack: not our ref`. It looks like a git or agent problem.
**Cause:** a submodule pointer set by hand (`git update-index --cacheinfo 160000,<sha>,<path>`
or a merge-conflict resolution) with one wrong hex digit. Git never validates a gitlink:
any well-formed 40-character hex is accepted, and `--cacheinfo` takes a SHA that exists
nowhere.
**Rule:** never type or transcribe a gitlink. Capture it from a command
(`git -C <sub> rev-parse <ref>^{commit}` or `git ls-remote origin refs/heads/<branch> | cut -f1`)
and, before committing, assert `git -C <sub> ls-remote origin | grep -c <sha>` is non-zero.
Diagnose fast with `git ls-tree <branch> <sub>` against `git -C <sub> ls-remote --heads origin`.

**The pointer must be on the submodule's matching branch and reachable**

**Symptom:** CI's shallow submodule clone cannot fetch the pointer; or a later bump to the
submodule branch tip silently drops a fix.
**Cause:** the parent pinned a commit that exists only on a feature branch, or on the
submodule's `<integration-branch>` while the parent is a release branch (or the reverse).
**Rule:** a pointer on the parent's branch X must be on the submodule's branch X and
reachable from `origin`. Check with `git -C <sub> branch -r --contains <sha>` before pushing
a bump.

**Check is-ancestor before every bump; merge the train in first**

**Symptom:** bumping a submodule to its release-branch tip drops fixes; or the bump commit
conflicts on every gitlink both sides moved.
**Cause:** a release branch can legitimately pin a submodule commit that is not an ancestor
of the submodule's release branch (a fix taken from `<integration-branch>`). A parent branch
behind the release train conflicts on every pointer the train also moved.
**Rule:** per submodule, `git -C <sub> merge-base --is-ancestor <current pin> <new sha>`; if it
fails, merge the pinned commit into the submodule's release branch first and point at the
merge. Merge the release train into the parent branch before bumping, as separate commits.

**Release fixes go to the release branch, not the integration branch**

**Symptom:** a fix for an in-flight release either misses the release or drags in everything
that landed on `<integration-branch>` since the release was cut.
**Cause:** the parent's release branch pins each submodule at its tip as of the cut; the
submodule usually has no release branch of its own yet.
**Rule:** create `release/<id>` in the submodule at the pinned commit
(`git ls-tree origin/release/<id> <sub>` gives it), branch the fix from there so the diff is
exactly the fix, PR fix -> `release/<id>`, then bump the gitlink on the parent's release
branch. The release branch merges back to `<integration-branch>` once verified.

**Submodule PR lands first; shared-library changes must stay safe for the old pointer**

**Symptom:** the parent merges and now references a submodule commit that is not on the
submodule's branch; or a shared-library contract change breaks a caller in a submodule
still pinned at the old commit.
**Cause:** parent and submodule PRs merge independently and the pointer bump lags the parent
merge, sometimes by days.
**Rule:** submodule PR first, then the parent PR carrying the bump. A change to a shared
library's contract (a thrown error where there was none, a storage shape, a renamed field)
must keep working for every current pointer: grep callers across all consumers
(`rg '<symbol>' apps/ libs/`) and keep the old default behind an opt-in. A cross-repo
storage shape must stay readable by the old reader.

**Commit onto a branch you are not on with a temporary index**

**Symptom:** you need a one-file commit on a remote branch, but the worktree is permanently
dirty (modified submodules) and switching or stashing risks dragging pointers into the commit.
**Cause:** `git checkout` and `git stash` operate on the whole tree; dirty gitlinks travel
with it.
**Rule:** build the commit with plumbing, touching no files:

```bash
BLOB=$(git hash-object -w path/to/edited-file)
export GIT_INDEX_FILE=/tmp/tmp.idx && rm -f "$GIT_INDEX_FILE"
git read-tree origin/<target-branch>
git update-index --cacheinfo 100644,$BLOB,path/to/edited-file   # 160000,<sha>,<sub> for a gitlink
TREE=$(git write-tree)
git diff-tree -r origin/<target-branch> $TREE                    # read this: only intended paths
COMMIT=$(git commit-tree $TREE -p origin/<target-branch> -m "[PROJ-123] ...")
git branch feature/PROJ-123-x $COMMIT && git push origin feature/PROJ-123-x
```

The `diff-tree` line is the safety check. For a gitlink, resolve the SHA with `rev-parse`
first (see the first lesson); `--cacheinfo` will not catch a typo. If you edited the file
in place to run tests against it, `git checkout -- <file>` afterwards; the content is safe
in the commit.

**Each worktree's submodule is its own object store**

**Symptom:** a commit made in one worktree's submodule is invisible from another worktree's
copy of the same submodule, even before pushing.
**Cause:** `git worktree add` gives each worktree its own submodule clone.
**Rule:** `git -C <wt2>/<sub> fetch <wt1>/<sub> <branch>` moves unpushed commits between
them. `git worktree remove` needs `--force` when the worktree holds submodules.

## Pull requests and the tracker

**The PR destination you requested is not the one you got**

**Symptom:** descriptions say "targets `<integration-branch>`" and the PR actually landed on
the repository's current default branch (a release branch during a release cycle). A
pointer-bump sequence written against the wrong branch then produces a gitlink that is not
on the submodule's branch.
**Cause:** the git host's create-PR API can override the requested destination with the repo
default; it can also silently return an already-open PR with the same source and
destination instead of creating one. Closing the base branch of a stacked PR can retarget
it automatically.
**Rule:** after creating a PR, read back `destination.branch.name`, `author` and
`created_on` before writing any sequencing claim into a description or ticket. When
reviewers cannot be set through the API, add them in the UI and say so. Link cross-repo PRs
with a full URL; the host auto-links a bare `PR #N` to the current repo.

**A commit pushed after the merge is stranded**

**Symptom:** a follow-up commit pushed to a branch whose PR just merged never reaches
`<integration-branch>`; the push recreates a stray remote branch someone has to delete.
**Cause:** merge-and-delete happened between your last check and your push.
**Rule:** re-read the PR state immediately before any push to a branch that has a PR. A
stranded commit needs its own PR.

**A merged branch's build links die**

**Symptom:** CI build URLs cited as acceptance evidence return 404 within hours of the merge.
**Cause:** CI prunes the multibranch job when the remote branch is deleted on merge, which is
the git host's default.
**Rule:** paste the decisive log lines (node names, timestamps, the command, the verdict
line) into the ticket comment and the PR description. Keep the URL as a convenience, never
as the evidence. When verifying an old acceptance criterion, read the comment body; do not
chase the link.

**Tracker automation acts on every key a PR mentions, and sometimes on none**

**Symptom:** an issue with no work done flips to Done a minute after an unrelated PR merged,
because its key was in the description ("blocks PROJ-456"). Another day, seven merges
transition nothing.
**Cause:** automation keyed on bare issue keys in PR text, and it is not reliable in either
direction.
**Rule:** a bare key in a PR description is a side effect on that issue, not prose. Name only
the PR's own key; phrase other references without the key. After a merge, transition the
ticket by hand and check every issue the PR mentioned. Verify a "Done" ticket against git
before trusting it; the tracker is not the source of truth for whether code exists.

**Preview environments collide on a truncated branch name**

**Symptom:** the second of two branches fails its environment stage with
`EntityAlreadyExists` or `BucketAlreadyOwnedByYou`; every later stage is skipped.
**Cause:** per-branch resource names are derived from the first N characters of the
sanitised branch name while the state key uses the full name. A branch and its
release-train twin (`...-feature` and `...-feature-release`) share the prefix.
**Rule:** make branch names differ inside the first N characters (put the distinguishing
token early, e.g. `feature/PROJ-123-rel-<slug>`), or accept the first post-merge build on
the target branch as the proof.

## Worktrees and local gates

**Symlink `node_modules` into a throwaway worktree**

**Symptom:** tests and lint cannot run in a fresh worktree, a full install takes minutes,
and the evidence step gets skipped.
**Cause:** `node_modules` and gitignored config are not part of the checkout.
**Rule:** `ln -s <main-checkout>/node_modules <worktree>/node_modules`, valid only while the
lockfiles are byte-identical and the main checkout's `node_modules` matches its own
`package.json` (compare `node_modules/<framework>/package.json`; a stale main checkout
passes tests against the wrong framework). Copy the gitignored env, auth and feature-flag
files too, or the app boots to a blank screen and every E2E spec fails. If the branch
changes the lockfile, do a real install.

**An opaque "failed to push some refs" from a fresh worktree**

**Symptom:** the push fails with only `error: failed to push some refs`, no gate output.
**Cause:** the Husky-generated `.husky/_/husky.sh` is gitignored and missing in the worktree;
the pre-push hook sources it on line 2 and dies silently.
**Rule:** copy `.husky/_` from the main checkout, or make the hook source `husky.sh` only when
it exists. Check this before assuming a branch-protection block.

**A guard that matches command text blocks legitimate pushes**

**Symptom:** `Blocked: pushing from protected branch <integration-branch>` when pushing a
feature branch from a worktree, or even from a different repository; a heredoc writing a
document that merely mentions the push phrase is refused too.
**Cause:** a PreToolUse guard reads `git branch --show-current` in the session's cwd (the main
checkout) and pattern-matches the command text, not the action or the target repo.
**Rule:** the guard should resolve the branch in the repo the command targets (`-C <path>`)
and match the git action, not the text. As a user of such a guard: keep real pushes in
their own `git -C <worktree> push origin <branch>` command, and write prose that mentions
the blocked phrase with the editor or Write tool, not a shell heredoc. Do not route around
a safety hook; when it fires, hand the exact command to the user.

**Hand the push to the user when the agent cannot bypass a gate**

**Symptom:** a merge commit that pulls the release branch into a PR branch fails the
pre-push sibling-spec check on files the PR never touched; the bypass flag is blocked for
the agent.
**Cause:** the hook diffs `remote_sha..local_sha`, so inherited files count as changed; the
bypass is reserved for human hotfixes by design.
**Rule:** do not add unrelated specs to satisfy the gate. Resolve conflicts, commit, run lint
and the affected specs with coverage yourself, then hand the user the push command with
the evidence. Long-term fix: diff against the merge-base with the target branch.

**A pre-push gate that lists no changed files proves nothing**

**Symptom:** push output shows an empty changed-file bullet and "No changes detected;
skipping lint and tests", exit 0.
**Cause:** seen three ways: the hook read git's stdin fields in the wrong order
(`<local ref> <local sha> <remote ref> <remote sha>`) so every range was empty; worktree
submodules have a `.git` file, not a directory, so a `[ -d "$sm/.git" ]` test skips them
all; and an intermittent empty list that never reproduced by hand.
**Rule:** a green push is not evidence the gate ran. Read the output for an actual file list.
If it is empty, run the checks yourself before opening the PR:

```bash
npx jest --config <lib>/jest.config.ts --coverage --collectCoverageFrom='src/lib/<file>.ts' <pattern>
npx eslint <changed files>
```

and in a worktree run each changed submodule's lint and tests by hand.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
