#!/bin/sh
# PreToolUse (Bash): three git guards in one script, because they share the
# "which directory does this git command run in" resolution.
#   1. `git push --no-verify` is for human hotfixes only.
#   2. No push from, or to, a protected branch: PRs only.
#   3. No commit that stages a submodule pointer unless the message says so.
# Reads the hook JSON on stdin. Exit 2 blocks, exit 0 allows.
#
# Why (3): in a monorepo of submodules, `git add -A` silently stages whichever
# commit each submodule happens to be checked out at. A pointer that moves
# backwards as a side effect of an unrelated commit is a regression no test
# catches, because the code is "right" in every repo on its own.

PROTECTED_BRANCHES="${PROTECTED_BRANCHES:-main master develop}"
BUMP_WORDS='[Bb]ump|submodule' # a commit message containing one of these is an intentional bump

c=$(jq -r '.tool_input.command // empty')
case "$c" in *git*) ;; *) exit 0 ;; esac

# Where the git command runs: a leading `cd X &&`, else `git -C X`, else the session cwd.
d=$(printf '%s' "$c" | sed -nE "s/^[[:space:]]*cd[[:space:]]+(\"[^\"]*\"|'[^']*'|[^[:space:];&|]+).*/\1/p")
[ -n "$d" ] || d=$(printf '%s' "$c" | sed -nE "s/.*git[[:space:]]+-C[[:space:]]+(\"[^\"]*\"|'[^']*'|[^[:space:];&|]+).*/\1/p")
d=$(printf '%s' "$d" | tr -d "'\"")
case "$d" in '~'*) d="$HOME${d#\~}" ;; esac
d="${d:-.}"

is_protected() {
  for b in $PROTECTED_BRANCHES; do [ "$1" = "$b" ] && return 0; done
  return 1
}

case "$c" in
  *'git push'*|*'git '*' push'*)
    case "$c" in *--no-verify*)
      echo 'Blocked: git push --no-verify bypasses the quality gate and is for human hotfixes only. Fix the gate failure instead.' >&2
      exit 2 ;;
    esac
    current=$(git -C "$d" branch --show-current 2>/dev/null)
    if is_protected "$current"; then
      echo "Blocked: pushing from protected branch $current. Create a feature branch and open a PR." >&2
      exit 2
    fi
    for b in $PROTECTED_BRANCHES; do
      # `origin <b>` and `<anything>:<b>`, as the last word or followed by a space.
      case "$c" in *"origin $b"|*"origin $b "*|*":$b"|*":$b "*)
        echo "Blocked: direct push to $b. PRs only." >&2
        exit 2 ;;
      esac
    done
    ;;
esac

case "$c" in
  *'git commit'*|*'git '*' commit'*)
    gitlinks='^:(160000|[0-7]{6} 160000)' # --raw lines whose old or new mode is a gitlink
    staged=$(git -C "$d" diff --cached --raw --ignore-submodules=dirty 2>/dev/null | grep -cE "$gitlinks")
    pending=0
    # Anything that stages "everything": add -A/--all/-u/., commit -a/-am/--all (also after `git -C X`).
    case "$c" in *'add -A'*|*'add --all'*|*'add -u'*|*'add .'|*'add . '*|*'add .;'*|*'add ./'*|*'commit -a'*|*'commit --all'*)
      pending=$(git -C "$d" diff HEAD --raw --ignore-submodules=dirty 2>/dev/null | grep -cE "$gitlinks") ;;
    esac
    if [ "${staged:-0}" -gt 0 ] || [ "${pending:-0}" -gt 0 ]; then
      if ! printf '%s' "$c" | grep -qE "$BUMP_WORDS"; then
        echo 'Blocked: a submodule pointer is staged, or this command would stage one (git add -A / commit -a). If the bump is intentional, say "bump" or "submodule" in the commit message; otherwise stage paths explicitly with git add <path>, or run git restore --staged <submodule-path>.' >&2
        exit 2
      fi
    fi
    ;;
esac
exit 0
