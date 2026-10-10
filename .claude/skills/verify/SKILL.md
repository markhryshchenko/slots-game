---
name: verify
description: Run the full Cardano Play project check with one script — Node/env, typecheck, exact math reference numbers from the sandbox, build, an HTTP flow (profile → spin → balance plus 401/400/404 cases) against a temporary server, and the real-time balance push over Centrifugo when it is running. Use after any code change, before saying a task is done, and before every commit.
---

# Verify

Run from the repo root:

```bash
bash .claude/skills/verify/smoke.sh
```

Every check prints `PASS` or `FAIL`. The script exits with 1 if anything failed, so a failure is never a matter of reading output by eye.

## What it checks

| # | Check | What a failure usually means |
|---|---|---|
| 1 | Node >= 24; `.env` has the session and Centrifugo secrets, `DATABASE_URL` and `REDIS_URL`; Postgres answers `pg_isready`, Redis answers `PING` | Run `nvm use`; create `.env` from `.env.example`; `docker compose up -d`; `npm run db:deploy` |
| 2 | `npm run typecheck` | A type error; the compiler output is printed above the FAIL line |
| 3 | Sandbox reference numbers from the exact `MathAnalyzer` | Math changed: strips, paytable, paylines, win evaluation or the money path |
| 4 | `npm run build` (server: tsc; client: tsc + vite build); the client imports nothing from the server | Compile or bundle error in `apps/*/src/`; a client import of server code breaks server authority — remove it, use the HTTP API |
| 5 | Built server starts on port 3999 | Startup error (config, game registry, invalid game config); the log path is printed |
| 6 | HTTP flow with a fresh player per run (balances persist in Postgres): `/health`, `POST /v1/profile`, spin 100 → `roundId`, `/v1/balance` equals the spin balance, `GET /v1/rounds/<roundId>` has the same `totalWin`, unknown round → 404, 401 without token, 400 for bet 101, 404 for an unknown game; `GET /v1/games/sevenslice` gives public rules and no reel strips; currencies: `GET /v1/rates`, `GET /v1/limits`, and for jpy, kwd, usdt profile → limits → spin `defaultBet` with `balanceFloat = balance / 10^exponent`, bet 100 in a usdt session → 400, unsupported currency → 400; `POST /v1/logout` → 204 and the same token → 401; security: malformed JSON → 400 JSON without a stack trace, unknown route → 404 JSON | API contract, wallet/session or error-handler regression. Needs `DEMO_OPERATOR_ENABLED=true` in the local `.env` |
| 7 | Realtime: `npm run watch:balance` — server-side subscription from the token over Centrifugo, 3 spins, every debit/credit pushed in order, last push = last spin balance, a reconnect recovers the missed balance from Redis history, another player's subscription denied, `POST /v1/realtime/token` renews a short-lived token, logout closes the connection with code 4501 and no reconnect, renewal after logout → 401, a second session of the same player keeps receiving pushes | Push path broken (`PublishingWallet`, Centrifugo or Redis config, token secret). **SKIP** (not FAIL) when Centrifugo is not running — start it with `docker compose up -d` |

The server runs on port **3999** (override with `SMOKE_PORT`), so it does not clash with a `npm run dev` on 3000. It is always stopped on exit, including after a failure.

## Reference numbers

Step 3 compares against values that are exact and deterministic: the analyzer enumerates all 1000 stop combinations, so no randomness is involved. Monte Carlo output is not compared, because it varies from run to run.

Change the expected values in `smoke.sh` **only** when the math was changed on purpose and the user agreed. Re-derive them with the `math-profile` skill. A math profile is a certified artifact; a silent change of these numbers is a bug.

## After it runs

- All PASS: report it in one line and continue (commit, hand off).
- Any FAIL: fix the cause, do not edit the check to make it pass. Run the script again until it is green.
