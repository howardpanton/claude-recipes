#!/bin/sh
# Every check this library claims, in one place. CI runs the same script.
# Usage: sh tools/check.sh          (needs sh, git and jq; no network)
#
# The scrub check needs a pattern of names that must never appear (the original
# company, product, hosts, people). The pattern itself is private, so it is not
# in this repo: put it in an untracked .scrub-pattern file (one extended regex
# on one line) or in the SCRUB_PATTERN environment variable. Without either,
# the scrub check is skipped and says so.
set -u
cd "$(dirname "$0")/.." || exit 1
fail=0
bad() { echo "FAIL $1"; fail=1; }

echo "# hook tests"
out=$(sh hooks/tests/run.sh 2>&1) || { echo "$out" | grep FAIL; fail=1; }
echo "$out" | tail -1

echo "# frontmatter"
# field <file> <key>: the value of a top-level frontmatter key, folded lines joined.
field() {
  awk -v k="$2" '
    NR == 1 { if ($0 != "---") exit; next }
    /^---$/ { exit }
    /^[A-Za-z_-]+:/ { on = (index($0, k ":") == 1); if (on) { sub(/^[^:]+:[ ]*(>-|\|)?[ ]*/, ""); printf "%s", $0 }; next }
    on { sub(/^[ ]+/, " "); printf "%s", $0 }
  ' "$1"
}
for f in skills/*/SKILL.md; do
  dir=$(basename "$(dirname "$f")")
  [ "$(field "$f" name)" = "$dir" ] || bad "$f: name does not match its directory"
  d=$(field "$f" description)
  [ -n "$d" ] || bad "$f: no description"
  case "$d" in *"Use when"*) ;; *) bad "$f: description has no \"Use when\"" ;; esac
  [ "${#d}" -le 500 ] || bad "$f: description is ${#d} characters (limit 500)"
  grep -q '^## Adapt to your repo' "$f" || bad "$f: no \"Adapt to your repo\" section"
done
for f in agents/*.md; do
  [ "$(field "$f" name)" = "$(basename "$f" .md)" ] || bad "$f: name does not match its file name"
  for k in description tools model; do
    [ -n "$(field "$f" "$k")" ] || bad "$f: no $k"
  done
done
for f in .claude-plugin/*.json plugins/*/.claude-plugin/plugin.json mods/*/.claude-plugin/plugin.json hooks/settings.hooks.json skills/*/evals/evals.json; do
  jq -e . "$f" >/dev/null 2>&1 || bad "$f: not valid JSON"
done

echo "# relative links"
broken=$(git ls-files --cached --others --exclude-standard '*.md' | while read -r f; do
  awk '/^ *```/ { c = !c; next } !c' "$f" | grep -oE '\]\([^)# ]+' | sed 's/^](//' | while read -r l; do
    case "$l" in (http*|mailto:*|*'<'*) continue ;; esac
    [ -e "$(dirname "$f")/$l" ] || echo "$f -> $l"
  done
done)
[ -z "$broken" ] || { echo "$broken"; bad "broken relative links"; }

echo "# scrub"
pat=${SCRUB_PATTERN:-}
[ -n "$pat" ] || { [ -f .scrub-pattern ] && pat=$(head -n 1 .scrub-pattern); }
if [ -z "$pat" ]; then
  echo "skipped: no SCRUB_PATTERN and no .scrub-pattern file"
else
  # The licence holder and this repo's own address are the only allowed matches.
  hits=$(git grep -nIiE --untracked -e "$pat" -- . ':!LICENSE' | grep -v 'howardpanton/claude-recipes')
  if [ -z "$hits" ]; then echo "clean"; else echo "$hits" | cut -d: -f1,2; bad "scrub pattern matched"; fi
fi

echo
if [ "$fail" -eq 0 ]; then echo "all checks passed"; else echo "checks FAILED"; fi
exit "$fail"
