# Submodule pointer bump - procedure

A pointer bump is the parent-repo commit that moves `apps/<feature>` to a new
child commit. It looks like a one-line diff but *is* the entire child change;
review it as such (`pr-review` skill).

```bash
# 0. Land the change in the child repo first: PR merged to its default branch.

# 1. In the parent, move the pointer to the merged commit:
cd apps/<feature>
git fetch origin
git checkout origin/<integration-branch>     # or the exact merged SHA
cd ../..

# 2. Read what the bump pulls in BEFORE committing:
git diff --submodule=log -- apps/<feature>

# 3. Commit the one-line pointer ("Subproject commit <sha>"):
git add apps/<feature>
git commit -m "[PROJ-123] Bump <feature> pointer"

# 4. Nothing else moved?
git submodule status | grep -v "(heads/<integration-branch>)"   # investigate any + or - row
```

## The invariant

The pointer must reference a commit **reachable on the child's default
branch**. An unmerged, rebased or force-pushed-away commit builds on your
machine and then breaks `git submodule update` for everyone else and for CI.
`.gitmodules` usually declares no `branch =` entry; the default branch is
convention - write it down in the root instructions file.

## Three checks before step 3, each learned the hard way

1. `git -C apps/<feature> branch -r --contains <sha>` - the child PR may have
   been merged into a release branch rather than the default branch. Bump to
   where it actually landed.
2. Verify the child's tip with `git fetch`, not the commit the parent happens
   to pin: that pin can be stale.
3. The PR target is not always `<integration-branch>`: a branch built off a
   release branch opens its PR against that release branch. Confirm the base
   before opening.

## After any merge or rebase

A merge commit can move pointers you never touched. Run `git submodule status`
after every merge or rebase and investigate any row not on the expected
branch. Fix a submodule regression by re-bumping the pointer **forward** to
the right commit, never by reverting parent commits across it - submodule
history is fragile.

Never hand-type a pointer SHA: one wrong hex digit fails every branch build at
checkout. Let `git checkout origin/<branch>` set it.
