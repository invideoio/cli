#!/usr/bin/env sh
# Rewrites the command tree in README.md between the commands:begin/end markers
# from the installed binary's help. Run after a release: scripts/commands.sh
set -eu

readme="$(dirname "$0")/../README.md"
tmp="$(mktemp)"

{
  echo '<!-- commands:begin -->'
  echo '```text'
  first=1
  # the root help: "  auth:       Sign in and out" -> name, description
  invideo --help 2>&1 | awk '/^  [a-z]+: / { name = $1; sub(":", "", name); sub(/^  [a-z]+: +/, ""); print name "\t" $0 }' |
  while IFS="$(printf '\t')" read -r cmd desc; do
    [ "$first" = 1 ] || echo
    first=0
    echo "$cmd  $desc"
    # the command's help: "  login <url>:        Sign in" -> "  auth login <url>    Sign in"
    invideo "$cmd" --help 2>&1 | awk -v cmd="$cmd" '
      /^COMMANDS/ { on = 1; next }
      /^[A-Z]/    { on = 0 }
      on && /^  [a-z]/ {
        line = $0; sub(/^  /, "", line)
        i = index(line, ":"); name = substr(line, 1, i - 1); rest = substr(line, i + 1)
        sub(/^ +/, "", rest)
        printf "  %-28s %s\n", cmd " " name, rest
      }
    '
  done
  echo '```'
  echo '<!-- commands:end -->'
} > "$tmp"

awk -v block="$tmp" '
  /<!-- commands:begin -->/ { while ((getline line < block) > 0) print line; skip = 1; next }
  /<!-- commands:end -->/   { skip = 0; next }
  !skip
' "$readme" > "$readme.new" && mv "$readme.new" "$readme"
rm -f "$tmp"
