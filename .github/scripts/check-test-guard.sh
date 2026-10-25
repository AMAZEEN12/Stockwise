#!/usr/bin/env bash
# Gate "Test edits during a fix" (DM23). Usage: check-test-guard.sh <base-ref> <branch-name>
# On fix/* branches: once a commit has ADDED a test file (the failing test), no later commit may
# modify, rename or delete any test file. Fix the code, not the test.
set -euo pipefail
BASE="${1:?base ref}"; BRANCH="${2:?branch name}"
case "$BRANCH" in fix/*) ;; *) echo "test-guard: not a fix/* branch, nothing to check"; exit 0 ;; esac
is_test() { case "$1" in
  service/src/test/*|web/src/*.test.ts|web/src/*.test.tsx|web/e2e/*|*IT.java|*Test.java) return 0 ;; *) return 1 ;; esac; }
armed=0; fail=0
for c in $(git rev-list --reverse --no-merges "$BASE"..HEAD); do
  while IFS=$'\t' read -r status path rest; do
    is_test "$path" || continue
    if [ "$armed" = 1 ] && [ "$status" != "A" ]; then
      echo "::error file=$path::Commit ${c:0:8} changes a test file ($status) after the failing test was committed. Fix the code, not the test."; fail=1
    fi
  done < <(git diff-tree --no-commit-id --name-status -r --no-renames "$c")
  if git diff-tree --no-commit-id --name-status -r --no-renames "$c" | awk -F'\t' '$1=="A"{print $2}' | while read -r p; do is_test "$p" && echo y; done | grep -q y; then armed=1; fi
done
[ "$fail" = 0 ] && echo "test-guard: OK"
exit "$fail"
