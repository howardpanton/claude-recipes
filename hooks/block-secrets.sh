#!/bin/sh
# PreToolUse (Edit|Write|MultiEdit): refuse to write content that looks like a credential.
# Reads the hook JSON on stdin. Exit 2 blocks, exit 0 allows.
#
# Why: a pasted key reaches the git history in the next commit. Rotating it is
# the cheap part; finding every clone and CI cache it reached is not.

# AWS access key, PEM private key, Slack token, GitHub token (classic and
# fine-grained), Anthropic API key, Google API key. Extend with your own.
PATTERNS='AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}'

# Write sends .content, Edit sends .new_string, MultiEdit sends .edits[].new_string.
text=$(jq -r '[.tool_input.content, .tool_input.new_string, (.tool_input.edits[]?.new_string)] | map(select(. != null)) | join("\n")')
[ -n "$text" ] || exit 0

if printf '%s' "$text" | grep -qE "$PATTERNS"; then
  echo 'Blocked: content matches a credential pattern (AWS key / private key / Slack, GitHub, Anthropic or Google token). Never write secrets into the repo: read them from an env var or the secret store.' >&2
  exit 2
fi
exit 0
