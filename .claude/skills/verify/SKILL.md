---
name: verify
description: Run the full Cardano Play project check with one script — Node/env, typecheck, exact math reference numbers from the sandbox, build, and an HTTP flow (profile → spin → balance plus 401/400/404 cases) against a temporary server. Use after any code change, before saying a task is done, and before every commit.
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
| 1 | Node >= 24, `.env` has `SESSION_JWT_SECRET` (>= 32 chars) | Run `nvm use`; create `.env` from `.env.example` |
| 2 | `npm run typecheck` | A type error; the compiler output is printed above the FAIL line |
| 3 | Sandbox reference numbers from the exact `MathAnalyzer` | Math changed: strips, paytable, paylines, win evaluation or the money path |
| 4 | `npm run build` | Compile error in `src/` |
| 5 | Built server starts on port 3999 | Startup error (config, game registry, invalid game config); the log path is printed |
| 6 | HTTP flow: `/health`, `POST /v1/profile`, spin 100 → `roundId`, `/v1/balance` equals the spin balance, 401 without token, 400 for bet 101, 404 for an unknown game | API contract or wallet/session regression |

The server runs on port **3999** (override with `SMOKE_PORT`), so it does not clash with a `npm run dev` on 3000. It is always stopped on exit, including after a failure.

## Reference numbers

Step 3 compares against values that are exact and deterministic: the analyzer enumerates all 1000 stop combinations, so no randomness is involved. Monte Carlo output is not compared, because it varies from run to run.

Change the expected values in `smoke.sh` **only** when the math was changed on purpose and the user agreed. Re-derive them with the `math-profile` skill. A math profile is a certified artifact; a silent change of these numbers is a bug.

## After it runs

- All PASS: report it in one line and continue (commit, hand off).
- Any FAIL: fix the cause, do not edit the check to make it pass. Run the script again until it is green.
