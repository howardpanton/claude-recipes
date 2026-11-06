#!/bin/sh
# PreToolUse (Edit|Write|MultiEdit): refuse edits to files a human or a bot owns.
# Reads the hook JSON on stdin. Exit 2 blocks the tool call (stderr goes back to
# Claude as the reason); exit 0 allows it.
#
# Why: an agent that "fixes" a lockfile by hand, pastes a token into .env, or
# edits a file a release bot rewrites produces a diff nobody can review and a
# merge conflict on the next bot run.

# Glob patterns, space-separated, matched against the full file path.
# Add the files a bot owns in your repo, e.g. a semantic-release CHANGELOG.md
# or a deploy pin file: "*CHANGELOG.md */deploy-pins.yaml".
PROTECTED="${PROTECTED_FILES:-*.env */.env *.env.* *yarn.lock *package-lock.json *pnpm-lock.yaml}"

f=$(jq -r '.tool_input.file_path // empty')
[ -n "$f" ] || exit 0

set -f # patterns are matched by case below, never expanded against the disk
for pattern in $PROTECTED; do
  case "$f" in
    $pattern)
      echo "Blocked: $f is a protected file (secret / lock file / bot-managed config). Edit it by hand if this is intentional." >&2
      exit 2
      ;;
  esac
done
exit 0
