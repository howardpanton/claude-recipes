#!/bin/sh
# Feeds sample hook JSON to each hook script and asserts the exit code.
# Usage: sh hooks/tests/run.sh       (needs sh, git and jq; no network)
# Each guard is exercised in both its blocking and its allowed case. The git
# guards run against throwaway repos built under a temp dir and removed at exit.
set -u
here=$(cd "$(dirname "$0")" && pwd)
hooks=$(dirname "$here")
fx="$here/fixtures"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$tmp" # so "." is not a git repo: the session-cwd fallback resolves to nothing
export CLAUDE_PROJECT_DIR="$tmp"
# Keep the throwaway repos free of the user's global git config (hooksPath, signing).
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
pass=0
fail=0

# check <expected exit> <script> <fixture file or inline JSON> <label>
check() {
  if [ -f "$3" ]; then
    err=$(sh "$hooks/$2" <"$3" 2>&1 >/dev/null); code=$?
  else
    err=$(printf '%s' "$3" | sh "$hooks/$2" 2>&1 >/dev/null); code=$?
  fi
  if [ "$code" -eq "$1" ]; then
    pass=$((pass + 1)); echo "ok   $2  $4 (exit $code)"
  else
    fail=$((fail + 1)); echo "FAIL $2  $4 (want exit $1, got $code) $err"
  fi
}
# assert_eq <actual> <expected> <label>
assert_eq() {
  if [ "$1" = "$2" ]; then pass=$((pass + 1)); echo "ok   $3"; else fail=$((fail + 1)); echo "FAIL $3 (got: $1)"; fi
}
bash_event() { jq -nc --arg c "$1" '{hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:$c}}'; }
write_event() { jq -nc --arg f "$1" '{hook_event_name:"PostToolUse",tool_name:"Write",tool_input:{file_path:$f,content:""}}'; }

echo "# protect-files.sh"
check 2 protect-files.sh "$fx/edit-env.json" "blocks .env"
check 2 protect-files.sh "$fx/write-lockfile.json" "blocks yarn.lock"
check 0 protect-files.sh "$fx/edit-source.json" "allows a source file"
check 0 protect-files.sh '{"tool_input":{}}' "allows an event without a path"

echo "# block-secrets.sh"
# Credential-shaped values are assembled here at runtime and spliced into the
# fixtures, so no file in this repo ever holds a token-shaped string that a
# secret scanner (or a hosting provider's push protection) would flag.
aws_key=$(printf 'AKIA%s' IOSFODNN7EXAMPLE)
priv_key=$(printf -- '-----BEGIN %s KEY-----' 'RSA PRIVATE')
slack_token=$(printf 'xox%s-%s' b 000000000000-not-a-real-token)
with_secret() { sed "s|@@SECRET@@|$2|" "$fx/$1"; }
check 2 block-secrets.sh "$(with_secret write-aws-key.json "$aws_key")" "blocks an AWS access key in Write content"
check 2 block-secrets.sh "$(with_secret edit-private-key.json "$priv_key")" "blocks a private key in Edit new_string"
check 2 block-secrets.sh "$(with_secret multiedit-slack-token.json "$slack_token")" "blocks a Slack token in MultiEdit edits"
check 0 block-secrets.sh "$fx/write-clean.json" "allows ordinary Write content"
check 0 block-secrets.sh "$fx/edit-source.json" "allows an ordinary Edit"

echo "# git-guards.sh (throwaway repos under $tmp)"
sub="$tmp/sub"
repo="$tmp/repo"
git init -q -b main "$sub" && git -C "$sub" commit -q --allow-empty -m init
git init -q -b develop "$repo"
git -C "$repo" -c protocol.file.allow=always submodule add -q "$sub" sub
git -C "$repo" commit -q -m "add submodule"
git -C "$repo/sub" commit -q --allow-empty -m "moves the pointer" # the pointer now differs from HEAD

check 2 git-guards.sh "$fx/bash-push-no-verify.json" "blocks --no-verify"
check 2 git-guards.sh "$(bash_event "cd $repo && git push")" "blocks a push from develop (cd X &&)"
check 2 git-guards.sh "$(bash_event "git -C $repo push -u origin HEAD")" "blocks a push from develop (git -C X)"
git -C "$repo" checkout -q -b feature/PROJ-123-x
check 0 git-guards.sh "$(bash_event "cd $repo && git push -u origin feature/PROJ-123-x")" "allows a push from a feature branch"
check 2 git-guards.sh "$fx/bash-push-to-main.json" "blocks a push to main by refspec"
check 2 git-guards.sh "$(bash_event "git -C $repo push origin develop")" "blocks a push to develop by name"
check 0 git-guards.sh "$fx/bash-push-maintenance.json" "allows origin maintenance (no prefix match on main)"
check 0 git-guards.sh "$fx/bash-non-git.json" "ignores non-git commands"

check 0 git-guards.sh "$(bash_event "git -C $repo commit -m 'wip'")" "allows a commit with nothing staged"
git -C "$repo" add sub
check 2 git-guards.sh "$(bash_event "cd $repo && git commit -m 'wip'")" "blocks a staged submodule pointer"
check 0 git-guards.sh "$(bash_event "cd $repo && git commit -m 'Bump sub to latest'")" "allows the same commit when the message says bump"
git -C "$repo" restore --staged sub
check 2 git-guards.sh "$(bash_event "git -C $repo commit -am 'wip'")" "blocks commit -a that would stage the pointer"
check 2 git-guards.sh "$(bash_event "cd $repo && git add -A && git commit -m 'wip'")" "blocks git add -A that would stage the pointer"
printf 'x\n' >"$repo/f.txt" && git -C "$repo" add f.txt
check 0 git-guards.sh "$(bash_event "git -C $repo commit -m 'add f.txt'")" "allows a commit of a plain staged file"

echo "# format-on-write.sh"
printf '#!/bin/sh\nprintf formatted >"$1"\n' >"$tmp/fmt.sh"
printf 'const  a=1\n' >"$tmp/x.ts"
printf 'text' >"$tmp/notes.md"
export FORMAT_CMD="sh $tmp/fmt.sh"
check 0 format-on-write.sh "$(write_event "$tmp/x.ts")" "exits 0 for a .ts file"
assert_eq "$(cat "$tmp/x.ts")" formatted "format-on-write.sh  the formatter ran on the .ts file"
check 0 format-on-write.sh "$(write_event "$tmp/notes.md")" "exits 0 for an extension not in the list"
assert_eq "$(cat "$tmp/notes.md")" text "format-on-write.sh  the formatter did not touch the .md file"
export FORMAT_CMD=false
check 0 format-on-write.sh "$(write_event "$tmp/x.ts")" "a failing formatter never fails the tool call"
unset FORMAT_CMD

echo "# telemetry.sh"
t="$tmp/transcript.jsonl"
printf '%s\n' \
  '{"type":"assistant","timestamp":"2026-01-01T00:00:00.000Z","message":{"model":"model-a","usage":{"input_tokens":10,"output_tokens":5,"cache_read_input_tokens":100,"cache_creation_input_tokens":20}}}' \
  '{"type":"user","timestamp":"2026-01-01T00:00:10.000Z"}' \
  '{"type":"assistant","timestamp":"2026-01-01T00:00:30.000Z","message":{"model":"model-a","usage":{"input_tokens":20,"output_tokens":7}}}' >"$t"
check 0 telemetry.sh "$(jq -nc --arg tp "$t" '{hook_event_name:"Stop",session_id:"s1",transcript_path:$tp}')" "Stop exits 0"
check 0 telemetry.sh "$(jq -nc --arg tp "$t" '{hook_event_name:"SubagentStop",session_id:"s1",agent_type:"reviewer",transcript_path:$tp}')" "SubagentStop exits 0"
check 0 telemetry.sh '{"hook_event_name":"Stop"}' "a missing transcript still exits 0"
log="$tmp/.claude/telemetry/agent-runs.jsonl"
assert_eq "$(jq -s 'length' "$log")" 3 "telemetry.sh  three lines appended"
assert_eq "$(jq -sc '.[0] | [.event, .turns, .input_tokens, .output_tokens, .cache_read_tokens, .duration_s, .model, has("cost")]' "$log")" \
  '["Stop",2,30,12,100,30,"model-a",false]' "telemetry.sh  cumulative snapshot, no cost field"
assert_eq "$(jq -sr '.[1].agent' "$log")" reviewer "telemetry.sh  SubagentStop records the agent type"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
