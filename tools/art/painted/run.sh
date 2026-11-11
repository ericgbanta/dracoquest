#!/bin/bash
# Usage: run.sh name ...   Generates each named prompt that has no output yet. Run from the gen folder.
gen() { n=$1; [ -s v2/out/$n.png ] && return 0
  timeout 600 codex exec --skip-git-repo-check --sandbox workspace-write -i v2/anchor.png -- "$(cat v2/prompts/$n.txt)" < /dev/null > v2/out/$n.log 2>&1
  [ -s v2/out/$n.png ] && echo "ok $n" || echo "FAILED $n: $(tail -2 v2/out/$n.log | cut -c1-200)"; }
export -f gen
printf '%s\n' "$@" | xargs -P 5 -I{} bash -c 'gen {}'
