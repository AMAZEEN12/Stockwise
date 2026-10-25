#!/usr/bin/env bash
# Post-deploy smoke check (deploy-plan §2). Usage:
#   API_URL=https://stockwise-api.onrender.com WEB_URL=https://stockwise.vercel.app scripts/smoke.sh
# Waits up to SMOKE_TIMEOUT seconds (default 300) for a cold Render service, then checks:
#   GET <api>/              -> 200 and {"status":"ok"}        (Qocent health check path)
#   GET <api>/api/v1/health -> 200 and "status":"UP"          (database reachable)
#   GET <web>/              -> 200 and an HTML page           (only if WEB_URL is set)
# Optional: EXPECT_VERSION=<sha> also requires the health body to report that version.
set -u
API_URL="${API_URL:?set API_URL}"; API_URL="${API_URL%/}"
WEB_URL="${WEB_URL:-}"; WEB_URL="${WEB_URL%/}"
TIMEOUT="${SMOKE_TIMEOUT:-300}"
fail=0
say() { printf '%s\n' "$*"; }

# fetch URL -> sets BODY and CODE; retries until $TIMEOUT for the first check only
fetch() { BODY=$(curl -sS -m 30 -w '\n%{http_code}' "$1" 2>/dev/null) || { CODE=000; BODY=""; return; }
          CODE="${BODY##*$'\n'}"; BODY="${BODY%$'\n'*}"; }

wait_for() { # url, grep pattern, label
  local start=$SECONDS
  while :; do
    fetch "$1"
    if [ "$CODE" = "200" ] && printf '%s' "$BODY" | grep -Eq "$2"; then say "PASS  $3 (HTTP 200, $((SECONDS-start))s)"; return 0; fi
    if [ $((SECONDS-start)) -ge "$TIMEOUT" ]; then say "FAIL  $3 (last HTTP $CODE after ${TIMEOUT}s)"; fail=1; return 1; fi
    sleep 5
  done
}

wait_for "$API_URL/" '"status" *: *"ok"' "service root /"
wait_for "$API_URL/api/v1/health" '"status" *: *"UP"' "service health /api/v1/health"
if [ -n "${EXPECT_VERSION:-}" ]; then
  if printf '%s' "$BODY" | grep -q "$EXPECT_VERSION"; then say "PASS  version $EXPECT_VERSION is live"
  else say "FAIL  health body does not report version $EXPECT_VERSION: $BODY"; fail=1; fi
fi
if [ -n "$WEB_URL" ]; then wait_for "$WEB_URL/" '<html|<!doctype html|<!DOCTYPE html' "web root /"; fi
[ "$fail" = 0 ] && say "SMOKE OK" || say "SMOKE FAILED"
exit "$fail"
