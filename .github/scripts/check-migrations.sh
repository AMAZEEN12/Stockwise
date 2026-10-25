#!/usr/bin/env bash
# Gates "Frozen migration" and "Missing undo script" (release.md). Usage: check-migrations.sh <base-ref>
# Never interpolate branch names into this script: the base ref arrives as an argument only.
set -euo pipefail
BASE="${1:?base ref}"
MIG=service/src/main/resources/db/migration
UNDO=service/src/main/resources/db/rollback
fail=0
while IFS=$'\t' read -r status path rest; do
  case "$path" in "$MIG"/V*) ;; *) continue ;; esac
  case "$status" in
    A) v=$(basename "$path" | sed -E 's/^V([0-9]+)__.*/\1/')
       if ! ls "$UNDO"/U"${v}"__*.sql >/dev/null 2>&1; then
         echo "::error file=$path::New migration V$v has no undo script $UNDO/U${v}__*.sql (DM13)"; fail=1; fi ;;
    *) echo "::error file=$path::Applied migration changed ($status). Migrations are frozen: write the next V<n+1> instead."; fail=1 ;;
  esac
done < <(git diff --name-status --no-renames "$BASE"...HEAD -- "$MIG")
[ "$fail" = 0 ] && echo "migrations: OK (no frozen migration changed, every new one has an undo script)"
exit "$fail"
