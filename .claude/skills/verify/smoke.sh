#!/usr/bin/env bash
# Full project check: environment, types, exact math reference numbers,
# build, and an HTTP flow against a temporary server.
# Usage (from anywhere): bash .claude/skills/verify/smoke.sh
set -uo pipefail

cd "$(dirname "$0")/../../.." || exit 1

PORT="${SMOKE_PORT:-3999}"
BASE="http://localhost:$PORT"
JSON_HEADER="Content-Type: application/json"
SERVER_LOG="${TMPDIR:-${TEMP:-/tmp}}/smoke-server.log"
CENTRIFUGO_HEALTH_URL="${CENTRIFUGO_HEALTH_URL:-http://localhost:9000/health}"
FAILED=0
SERVER_PID=""

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILED=1; }
check() {
  local name="$1"
  shift
  if "$@"; then pass "$name"; else fail "$name"; fi
}

# Reads JSON from stdin and prints the given JS expression over it (`o`).
json() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log($1)}catch{console.log('')}})"
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

port_listening() { curl -s -o /dev/null -m 1 "$BASE/health"; }

stop_server() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    SERVER_PID=""
  fi

  # Fallback for Windows: kill whatever still listens on the smoke port.
  if port_listening && command -v netstat >/dev/null; then
    local pid
    pid=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep LISTENING | awk '{print $5}' | head -1)
    [ -n "$pid" ] && taskkill //PID "$pid" //F >/dev/null 2>&1
  fi
}
trap stop_server EXIT

echo "== 1. Environment"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
check "Node >= 24 (found $(node -v 2>/dev/null || echo none))" test "$NODE_MAJOR" -ge 24
check ".env has SESSION_JWT_SECRET (>= 32 chars)" grep -qE '^SESSION_JWT_SECRET=.{32,}' .env
check ".env has Centrifugo secrets" grep -qE '^CENTRIFUGO_TOKEN_SECRET=.{32,}' .env
check ".env has DATABASE_URL" grep -qE '^DATABASE_URL=postgres' .env
check ".env has REDIS_URL" grep -qE '^REDIS_URL=redis' .env
# The HTTP flow logs in through the demo operator, which is off unless enabled.
check ".env has DEMO_OPERATOR_ENABLED=true (local only)" grep -qE '^DEMO_OPERATOR_ENABLED=true' .env
# The wallet lives in Postgres: without it the server cannot start.
check "Postgres is up (docker compose)" \
  sh -c 'docker compose exec -T postgres pg_isready -U slots -d slots >/dev/null 2>&1'
# Sessions live in Redis; REDISCLI_AUTH inside the container carries the password.
check "Redis is up and answers PING (docker compose)"   sh -c 'test "$(docker compose exec -T redis redis-cli ping 2>/dev/null | tr -d "")" = PONG'
if [ "$FAILED" -ne 0 ]; then
  echo "Environment is not ready: run 'nvm use', create .env from .env.example, 'docker compose up -d', 'npm run db:deploy'."
  exit 1
fi

echo "== 2. Types"
check "npm run typecheck" npm run --silent typecheck

echo "== 3. Math reference numbers (exact analyzer, deterministic)"
SANDBOX_OUTPUT=$(npm run --silent sandbox 2>&1)
for expected in \
  "Theoretical RTP: 0.96" \
  "Hit rate: 0.297" \
  "3.428829666383483" \
  "1.6772580136772175" \
  "13.000020032035849"; do
  check "sandbox contains '$expected'" grep -qF "$expected" <<<"$SANDBOX_OUTPUT"
done

echo "== 4. Build"
check "npm run build" npm run --silent build

echo "== 5. Server on port $PORT"
if port_listening; then
  fail "port $PORT is already in use (set SMOKE_PORT to another port)"
else
  # A variable already set in the environment wins over --env-file.
  PORT="$PORT" node --env-file=.env dist/server/server.js >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  for _ in $(seq 1 20); do
    port_listening && break
    sleep 0.5
  done

  check "server answers /health (log: $SERVER_LOG)" port_listening
fi

if [ -n "$SERVER_PID" ] && port_listening; then
  echo "== 6. HTTP flow"
  check "GET /health -> 200" test "$(status "$BASE/health")" = 200

  # Balances persist in Postgres, so every run uses a fresh player.
  PROFILE=$(curl -s -X POST "$BASE/v1/profile" -H "$JSON_HEADER" \
    -d "{\"token\":\"smoke-$(date +%s)-$RANDOM\",\"cid\":\"democustomer\",\"gameId\":\"sevenslice\"}")
  TOKEN=$(json 'o.sessionToken ?? ""' <<<"$PROFILE")
  check "POST /v1/profile -> sessionToken" test -n "$TOKEN"

  SPIN=$(curl -s -X POST "$BASE/v1/games/sevenslice/spin" -H "$JSON_HEADER" \
    -H "Authorization: Bearer $TOKEN" -d '{"bet":100}')
  ROUND_ID=$(json 'o.roundId ?? ""' <<<"$SPIN")
  SPIN_BALANCE=$(json 'o.balance ?? ""' <<<"$SPIN")
  check "spin 100 -> roundId" test -n "$ROUND_ID"

  BALANCE=$(curl -s "$BASE/v1/balance" -H "Authorization: Bearer $TOKEN" | json 'o.balance ?? ""')
  check "GET /v1/balance equals spin balance ($SPIN_BALANCE)" \
    test -n "$BALANCE" -a "$BALANCE" = "$SPIN_BALANCE"

  # The round is recorded in the same transaction as its money.
  SPIN_WIN=$(json 'o.totalWin ?? ""' <<<"$SPIN")
  ROUND_WIN=$(curl -s "$BASE/v1/rounds/$ROUND_ID" -H "Authorization: Bearer $TOKEN" | json 'o.totalWin ?? ""')
  check "GET /v1/rounds/<roundId> -> recorded with the same totalWin ($SPIN_WIN)" \
    test -n "$ROUND_WIN" -a "$ROUND_WIN" = "$SPIN_WIN"
  check "unknown roundId -> 404" test "$(status "$BASE/v1/rounds/no-such-round" \
    -H "Authorization: Bearer $TOKEN")" = 404

  check "spin without token -> 401" test "$(status -X POST "$BASE/v1/games/sevenslice/spin" \
    -H "$JSON_HEADER" -d '{"bet":100}')" = 401
  check "bet 101 -> 400" test "$(status -X POST "$BASE/v1/games/sevenslice/spin" \
    -H "$JSON_HEADER" -H "Authorization: Bearer $TOKEN" -d '{"bet":101}')" = 400
  check "unknown game -> 404" test "$(status -X POST "$BASE/v1/games/unknown/spin" \
    -H "$JSON_HEADER" -H "Authorization: Bearer $TOKEN" -d '{"bet":100}')" = 404

  # Currencies, rates and limits: the bet ladder belongs to the operator and
  # the currency, and balanceFloat follows the currency's exponent.
  RATES=$(curl -s "$BASE/v1/rates")
  check "GET /v1/rates -> snapshot with jpy" test "$(json 'typeof o.rates?.jpy' <<<"$RATES")" = number
  LIMITS=$(curl -s "$BASE/v1/limits" -H "Authorization: Bearer $TOKEN")
  check "GET /v1/limits -> defaultBet is one of betLevels" \
    test "$(json 'o.betLevels.includes(o.defaultBet) && o.currency === "usd"' <<<"$LIMITS")" = true

  for CUR in jpy kwd usdt; do
    CUR_PROFILE=$(curl -s -X POST "$BASE/v1/profile" -H "$JSON_HEADER" \
      -d "{\"token\":\"smoke-$CUR-$(date +%s)-$RANDOM\",\"cid\":\"democustomer\",\"gameId\":\"sevenslice\",\"currency\":\"$CUR\"}")
    CUR_TOKEN=$(json 'o.sessionToken ?? ""' <<<"$CUR_PROFILE")
    EXPONENT=$(json 'o.currencyExponent ?? ""' <<<"$CUR_PROFILE")
    DEFAULT_BET=$(curl -s "$BASE/v1/limits" -H "Authorization: Bearer $CUR_TOKEN" | json 'o.defaultBet ?? ""')
    CUR_SPIN=$(curl -s -X POST "$BASE/v1/games/sevenslice/spin" -H "$JSON_HEADER" \
      -H "Authorization: Bearer $CUR_TOKEN" -d "{\"bet\":${DEFAULT_BET:-0}}")
    check "$CUR: profile -> limits -> spin defaultBet $DEFAULT_BET, balanceFloat = balance / 10^$EXPONENT" \
      test "$(json "o.currency === '$CUR' && o.balanceFloat === o.balance / 10 ** $EXPONENT" <<<"$CUR_SPIN")" = true
  done
  # 100 is a valid usd bet but not on the usdt ladder (micro-USDT).
  check "usdt session, bet 100 -> 400" test "$(status -X POST "$BASE/v1/games/sevenslice/spin" \
    -H "$JSON_HEADER" -H "Authorization: Bearer $CUR_TOKEN" -d '{"bet":100}')" = 400
  check "unsupported currency -> 400" test "$(status -X POST "$BASE/v1/profile" -H "$JSON_HEADER" \
    -d '{"token":"smoke-gbp","cid":"democustomer","gameId":"sevenslice","currency":"gbp"}')" = 400

  # Logout ends the server-side session: the same token stops working at once.
  check "POST /v1/logout -> 204" test "$(status -X POST "$BASE/v1/logout"     -H "Authorization: Bearer $CUR_TOKEN")" = 204
  check "token after logout -> 401" test "$(status "$BASE/v1/balance"     -H "Authorization: Bearer $CUR_TOKEN")" = 401

  # Security: errors are JSON and never leak a stack trace or file paths.
  BROKEN=$(curl -s -w ' %{http_code}' -X POST "$BASE/v1/profile" -H "$JSON_HEADER" -d '{"token": broken')
  check "malformed JSON -> 400 JSON, no stack trace" \
    sh -c 'case "$1" in *"Malformed JSON body"*400) ! printf %s "$1" | grep -qE "node_modules|at JSON|<pre>";; *) false;; esac' _ "$BROKEN"
  check "unknown route -> 404 JSON" \
    test "$(curl -s -w ' %{http_code}' "$BASE/no-such-route")" = '{"error":"Not found"} 404'

  echo "== 7. Realtime balance over Centrifugo"
  if curl -s -o /dev/null -m 2 "$CENTRIFUGO_HEALTH_URL"; then
    check "npm run watch:balance (ordered pushes, foreign channel denied)" \
      env API_URL="$BASE" npm run --silent watch:balance
  else
    printf 'SKIP  Centrifugo is not running (docker compose up -d)\n'
  fi
fi

echo
if [ "$FAILED" -ne 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
fi

echo "ALL CHECKS PASSED"
