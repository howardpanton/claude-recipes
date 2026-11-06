#!/bin/sh
# PostToolUse (Edit|Write|MultiEdit): run the repo formatter on the file just written.
# Reads the hook JSON on stdin. Always exits 0: a formatter error is the
# formatter's problem, not the edit's, and a PostToolUse hook cannot undo the edit.
#
# Why: hand-formatted files fail the lint gate at push time and bury the real
# change under whitespace noise in review.

FORMAT_CMD="${FORMAT_CMD:-npx prettier --write}"      # run from the project root, file path appended
EXTENSIONS="${FORMAT_EXTENSIONS:-ts tsx html scss css json}"

f=$(jq -r '.tool_input.file_path // empty')
[ -n "$f" ] && [ -f "$f" ] || exit 0
ext="${f##*.}"
for e in $EXTENSIONS; do
  if [ "$ext" = "$e" ]; then
    (cd "${CLAUDE_PROJECT_DIR:-.}" && $FORMAT_CMD "$f" >/dev/null 2>&1) || true
    break
  fi
done
exit 0
