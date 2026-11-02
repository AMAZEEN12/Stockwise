#!/usr/bin/env bash
# Post-deploy smoke check (deploy-plan §2). Usage:
#   API_URL=https://stockwise-api.onrender.com WEB_URL=https://stockwise.vercel.app scripts/smoke.sh
# Waits up to SMOKE_TIMEOUT seconds (default 300) for a cold Render service, then checks:
#   GET <api>/              -> 200 and {"status":"ok"}        (Qocent health check path)
#   GET <api>/api/v1/health -> 200 and "status":"UP"          (database reachable)
#   GET <web>/              -> 200 and an HTML page           (only if WEB_URL is set)
#   the web's JavaScript    -> calls <api>/api/v1             (only if WEB_URL is set)
#   POST <api>/api/v1/auth/sessions -> 201 with a token       (only if LOGIN_EMAIL and LOGIN_PASSWORD are set)
# Optional: EXPECT_VERSION=<sha> also requires the health body to report that version.
# API_URL is the service's root address; a trailing "/api/v1" is accepted and removed.
set -u
API_URL="${API_URL:?set API_URL}"; API_URL="${API_URL%/}"; API_URL="${API_URL%/api/v1}"
API_BASE="$API_URL/api/v1"
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
if [ -n "$WEB_URL" ]; then
  wait_for "$WEB_URL/" '<html|<!doctype html|<!DOCTYPE html' "web root /"
  # The web is built with VITE_API_BASE_URL baked in. Check the live bundle really calls <api>/api/v1:
  # a base without /api/v1 sends sign-in to a path the service doesn't have (401 "wrong email or password").
  bundles=$(printf '%s' "$BODY" | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | sort -u)
  found=0
  for b in $bundles; do
    if curl -sS -m 30 "$WEB_URL$b" 2>/dev/null | grep -qF "\"$API_BASE\""; then found=1; break; fi
  done
  if [ "$found" = 1 ]; then say "PASS  web calls $API_BASE"
  else say "FAIL  the web's JavaScript does not call \"$API_BASE\" (check VITE_API_BASE_URL and rebuild)"; fail=1; fi
fi
if [ -n "${LOGIN_EMAIL:-}" ] && [ -n "${LOGIN_PASSWORD:-}" ]; then
  # The demo sign-in, on the path the web uses. Never prints the password or the token.
  body=$(printf '{"email":"%s","password":"%s"}' "$LOGIN_EMAIL" "$LOGIN_PASSWORD")
  resp=$(curl -sS -m 90 -w '\n%{http_code}' -X POST "$API_BASE/auth/sessions" -H 'Content-Type: application/json' -d "$body" 2>/dev/null) || resp=$'\n000'
  code="${resp##*$'\n'}"
  if [ "$code" = "201" ] && printf '%s' "$resp" | grep -q '"accessToken"'; then say "PASS  sign-in $LOGIN_EMAIL at $API_BASE/auth/sessions (HTTP 201)"
  else say "FAIL  sign-in $LOGIN_EMAIL at $API_BASE/auth/sessions (HTTP $code); is the demo seed loaded (SEED_DEMO=true)?"; fail=1; fi
fi
[ "$fail" = 0 ] && say "SMOKE OK" || say "SMOKE FAILED"
exit "$fail"
