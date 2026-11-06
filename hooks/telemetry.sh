#!/bin/sh
# Stop / SubagentStop: append one JSON line per event to
# .claude/telemetry/agent-runs.jsonl (git-ignore it). Reads the hook JSON on stdin.
#
# Token and duration numbers are CUMULATIVE for the transcript at event time: a
# session that stops N times logs N growing snapshots, so consumers take the max
# (or the diff) per session. Cost is deliberately NOT computed here: record the
# model and the tokens, derive cost at render time, so a stale price table can
# never poison the log.
in=$(cat)
d="${CLAUDE_PROJECT_DIR:-.}/.claude/telemetry"
mkdir -p "$d" 2>/dev/null
tp=$(printf '%s' "$in" | jq -r '.transcript_path // empty')
stats='{}'
if [ -n "$tp" ] && [ -f "$tp" ]; then
  # jq -s loads the whole transcript into memory: fine for session-sized files.
  # Switch to `jq -n 'reduce inputs ...'` if transcripts ever get huge.
  stats=$(jq -cs '
    [.[] | select(.type == "assistant" and .message.usage != null)] as $a
    | ([.[] | .timestamp? // empty | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601? // empty] | sort) as $t
    | {model: (($a | last | .message.model) // null),
       turns: ($a | length),
       input_tokens: ([$a[].message.usage.input_tokens // 0] | add // 0),
       output_tokens: ([$a[].message.usage.output_tokens // 0] | add // 0),
       cache_read_tokens: ([$a[].message.usage.cache_read_input_tokens // 0] | add // 0),
       cache_creation_tokens: ([$a[].message.usage.cache_creation_input_tokens // 0] | add // 0),
       duration_s: (if ($t | length) > 1 then (($t | last) - ($t | first)) else null end)}
  ' "$tp" 2>/dev/null) || stats='{}'
  [ -n "$stats" ] || stats='{}'
fi
printf '%s' "$in" | jq -c --argjson s "$stats" '
  {ts: (now | todate),
   event: (.hook_event_name // "Stop"),
   session: (.session_id // null),
   agent: (.agent_type // .agent_name // null)} + $s
' >> "$d/agent-runs.jsonl" 2>/dev/null || true
exit 0
