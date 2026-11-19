# Release train: where every sweep PR goes

Bug fixes ride the next release, not `<integration-branch>`. This assumes release
branches named by their release date, `release/YYYY-MM-DD`. Resolve the train once per
run and record it in `00-state.md` as `Base: release/YYYY-MM-DD`.

```bash
INT=<integration-branch>
git fetch -q origin
today=$(date +%F)
train=""
branches=$(git branch -r --list 'origin/release/20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]' | sed 's#origin/##' | sort -r)
for b in $branches; do
  d=${b#release/}
  [[ "$d" > "$today" ]] || continue                       # date still in the future
  git merge-base --is-ancestor origin/$INT origin/$b && { train=$b; echo "$b"; break; }
done
# Fallback: the integration branch has moved ahead since the last merge-back.
if [[ -z "$train" ]]; then
  for b in $branches; do
    d=${b#release/}; [[ "$d" > "$today" ]] || continue
    echo "$b ($INT ahead by $(git rev-list --count origin/$b..origin/$INT) commits; merge-back owed)"; break
  done
fi
```

Rules:

- The train is the newest dated release branch that is still ahead of today **and**
  already contains the integration branch.
- If no future-dated branch contains the integration branch yet (the release owner has
  not merged it in since the last merges), the newest future-dated branch is still the
  train. Use it, record `Base: <train> (<integration-branch> ahead by N; merge-back
  owed)`, and say so in the `starting` message.
- A branch whose date has passed is a frozen release and is never the target.
- No future-dated release branch at all: post `needs-clarity` asking which branch the
  sweep should target, print "no release train", stop. Do not fall back to the
  integration branch.

## Mechanics

- The worktree is created from `origin/<train>` and the PR targets `<train>`. Pass
  `--base=<train>` to the pipeline.
- In a repository with submodules, the submodule branch is cut from the commit the
  train pins (`git ls-tree origin/<train> <submodule-path>`), never from the submodule's
  own integration-branch head. The submodule PR targets the submodule's own `<train>`
  branch; create that branch at the pinned commit if it does not exist, and push it
  before opening the PR. Landing order is unchanged: submodule PR first, then the
  parent's pointer bump (see `change-control`).
- Read back every PR's destination branch after creation. A `<git-host>` can silently
  retarget a PR to its default branch.
- Merging the train back to the integration branch is the release owner's job, not the
  sweep's.
