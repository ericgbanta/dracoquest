#!/bin/bash
# Usage: run.sh name ...   Generates each named prompt that has no output yet, five at a time. Run from the gen folder.
# A second reference image is passed when v2/refs/<name>.png exists (the same character in another pose).
gen() { n=$1; [ -s v2/out/$n.png ] && return 0
  refs=(-i v2/anchor.png); [ -s v2/refs/$n.png ] && refs+=(-i v2/refs/$n.png)
  timeout 600 codex exec --skip-git-repo-check --sandbox workspace-write "${refs[@]}" -- "$(cat v2/prompts/$n.txt)" < /dev/null > v2/out/$n.log 2>&1
  [ -s v2/out/$n.png ] && echo "ok $n" || echo "FAILED $n: $(tail -2 v2/out/$n.log | cut -c1-200)"; }
export -f gen
printf '%s\n' "$@" | xargs -P 5 -I{} bash -c 'gen {}'
