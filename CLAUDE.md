# CLAUDE.md

Slot game platform of the provider **Cardano Play**. First game: **Seven Slice** (classic fruit slot, 3×3, 5 paylines). TypeScript, Express 5, Node 24 LTS.

The whole design is **server-authoritative**: only the server decides a spin outcome and moves money. A client only renders results.

## Commands

```bash
nvm use                 # Node version from .nvmrc (24.x); engines: node >= 24
cp .env.example .env    # then fill the secrets (each >= 32 chars)
docker compose up -d    # Postgres (127.0.0.1:5432) + Redis (127.0.0.1:6379, password) + Centrifugo (:9000, admin UI there too)
npm run db:deploy       # apply migrations to the database

npm run dev             # API on :3000 with watch (loads .env); prisma generate runs first
npm run db:migrate      # create + apply a new migration after editing prisma/schema.prisma
npm run watch:balance   # end-to-end check of balance pushes over Centrifugo
npm run sandbox         # math sandbox: demo spin, exact analyzer, Monte Carlo
npm run typecheck       # tsc --noEmit
npm run build           # compile src/ → dist/
npm start               # run dist/server/server.js (loads .env)
```

Full check before "done" or a commit: the `verify` skill (`bash .claude/skills/verify/smoke.sh`).

## Layout and dependency rules

```text
src/core/             RNG, MathRNG, CryptoRNG, money (toMajorUnits) — shared by every future engine
src/engines/slot/     slot mechanics: SlotMachine, Reel, createGrid, WinEvaluator, createBet
src/engines/slot/analysis/  MathAnalyzer (exact), ReelAnalyzer
src/games/            GameConfig, validateGameConfig, registry.ts (the only place a game is registered)
src/games/<gameId>/   config.ts, symbols.ts, math/<profile>.ts — data only, no logic
src/platform/         db (createPrisma, createRedis), operators (OperatorConfig with limits per currency, validateOperatorConfig),
                      sessions (SessionService, SessionStore port, RedisSessionStore, InMemorySessionStore for tests),
                      currencies (registry: exponent, symbol; static rates snapshot),
                      wallet (Wallet port, PostgresWallet, InternalWallet in-memory for tests),
                      wallet/ledgerOperation.ts (the one money operation used inside any transaction),
                      rounds (RoundSettler / RoundHistory ports, PostgresRoundSettler),
                      outbox (events, OutboxRelay), realtime (RealtimePublisher port, CentrifugoPublisher), db
src/generated/prisma/ generated Prisma client — gitignored, never edit (prisma generate)
prisma/               schema.prisma and migrations (never edit an applied migration)
src/tools/            dev tools, e.g. watchBalance.ts
centrifugo/config.json, docker-compose.yml   infrastructure: Postgres, Redis, Centrifugo (no secrets in git)
src/server/           Express: routes → middleware → controllers → services; config.ts, platform.ts
src/simulation/       MathSimulator (Monte Carlo)
src/sandbox.ts        console sandbox, not the server
```

- `core` imports nothing from the project.
- `engines/slot` never imports `games`, `platform` or `server`, and knows no concrete game or symbol.
- `games/*` holds data; it may import engine types, never `server` or `platform`.
- `server` composes everything; game logic does not live in controllers or routes.
- A game client must never import the engine (it would leak reel strips and break server authority).

## Domain rules

- **Money:** integer minor units plus a lowercase ISO 4217 currency, Stripe-style, in the engine, the wallet and the API. No floats for money. Each currency has an `exponent` (`platform/currencies`): usd/eur 2, jpy 0, kwd 3, usdt 6. `*Cents` field and column names mean minor units of the row's currency. Human-readable copies (`balanceFloat`) go through `toDisplayAmount`; `fromCents` is only for the math reports (sandbox, analyzer, simulator). An account keeps the currency it was opened in; money is never converted.
- **Rates** (`GET /v1/rates`) are a static, informational snapshot for clients and future reports; never use them to move money.
- **Bets and limits belong to the operator and the currency, not to the game:** `OperatorConfig.currencies[code]` holds `startingBalance`, `betLevels`, `defaultBet`, `maxWin` (minor units), served by `GET /v1/limits`. A spin accepts only a bet from the session's ladder; `createBet` still rejects bets not divisible by the paylines count. `validateOperatorConfig` checks every ladder against the paylines of every game at startup.
- **Max win:** the payout of a round is capped at `maxWin`; the round stores `maxWinReached`, and its `wins` stay uncapped, so a replay explains the difference.
- **Spin order:** validate the bet → compute the outcome (pure) → `RoundSettler.settle` commits debit, credit (on a win), the `GameRound` record and the outbox events in ONE transaction → only then return the result. An outcome whose bet cannot be paid is discarded and never shown. Settlement is idempotent per `roundId`.
- **Rounds are the unit of audit:** every round stores `stops`, `grid`, `wins` and `mathProfileId`, so it can be replayed from its stops. Players read only their own rounds (`GET /v1/rounds`, `/v1/rounds/:roundId`); another player's round answers 404 like a missing one.
- **Wallet:** the balance belongs to the player, not the game. `PostgresWallet` is the source of truth: each debit/credit is one transaction — atomic `UPDATE … WHERE balance >= x`, an append-only ledger entry and an outbox event. Idempotency is enforced by `UNIQUE(type, roundId)`. Never change money outside this transaction. Amounts are `BIGINT` in Postgres and safe-integer `number` in the app.
- **Symbols belong to the game.** The engine treats them as strings; profiles are typed `MathConfig<GameSymbol>` so typos fail to compile.
- **Math profiles are certified artifacts.** They live as TS files in git. Never change a live profile silently; create a new profile id and verify it with `MathAnalyzer` and `MathSimulator` (skill `math-profile`).
- **RNG:** behind the `RNG` interface. Real spins use `CryptoRNG` (`node:crypto` `randomInt`, a CSPRNG): stop positions go to the client, and `Math.random`'s state could be reconstructed from them. `MathRNG` (`Math.random`) is for the sandbox and learning only. A certified RNG is a later compliance step.
- **Demo operator** `democustomer` accepts any launch token and gives free balance; it exists only when `DEMO_OPERATOR_ENABLED=true` (local dev and tests). A disabled demo operator answers like an unknown one. Never enable it in production.
- **Errors never leak internals:** `errorHandler` and `notFoundHandler` (`src/server/middleware/errorHandler.ts`) always answer `{ "error": "..." }`; 5xx details go to the server log only, never stack traces or paths to the client.
- **Sessions:** JWT (HS256, `jose`) with `sub = <operatorId>@<playerId>`, `sid` and `exp`, backed by a server-side session in Redis (`session:<sid>`, `SET … EX` with the same TTL as the token), so sessions survive API restarts, are shared by every API instance and expire by themselves. `POST /v1/logout` deletes the session; its token answers 401 at once. A stored value of the wrong shape counts as no session. Secrets come from env, never from code.
- **Transactional outbox:** notifications are domain events (`balance.changed`) written in the money transaction, never sent directly. `OutboxRelay` delivers them in id order, at least once, with backoff, and drains the backlog on startup, so a crash loses nothing. Events carry the absolute balance, so duplicates are harmless. One relay per database for now.
- **Real-time balance:** Centrifugo only delivers. The relay publishes `{balance, currency, roundId, reason}` to the channel `balance:<playerId>`. It is a **server-side subscription**: the `balance` namespace forbids client-side subscribe, and a connection gets the channel only from the `channels` claim of its token, which the API signs for the session's player. The token's `sub` is the **sessionId**, not the playerId, so Centrifugo can tell launches of the same player apart. `playerId` must be unique across the platform. The Centrifugo connection token has its own secret (`CENTRIFUGO_TOKEN_SECRET`), which must differ from `SESSION_JWT_SECRET`. It is short-lived (`CENTRIFUGO_TOKEN_TTL_SECONDS`, 300 by default, never past the session) and renewed by the client SDK via `POST /v1/realtime/token`, which needs a live session. Logout calls Centrifugo `disconnect` for `user = sessionId` — only that session's connections, other launches keep their feed — with the terminal code 4501 (4500–4999: no reconnect); it is best effort, and the short token bounds the window if Centrifugo is unreachable.
- **Redis** holds two things: API sessions (above) and the Centrifugo engine — a broker between Centrifugo nodes and the channel history. Balance channels use cache recovery (`history_size: 1`), so a client that reconnects gets the latest balance it missed. A brand-new client has nothing to recover and takes its starting balance over HTTP (profile / `GET /v1/balance`). Redis is published on `127.0.0.1:6379` only and requires `REDIS_PASSWORD`; Centrifugo gets the address with the password from env (`CENTRIFUGO_ENGINE_REDIS_ADDRESS`), never from `config.json`. Redis has no persistence: a restart logs every player out, nothing else is lost. Money never lives in Redis; the ledger goes to Postgres.
- **Git Bash on Windows** rewrites arguments that start with `/` into Windows paths (e.g. in `docker run ... --config=/x`). Set `MSYS_NO_PATHCONV=1` for such commands.

## Code conventions

- ESM with `module: nodenext`: relative imports end in `.js` even for `.ts` files.
- `noUncheckedIndexedAccess` is on: guard index access explicitly and throw a clear error; do not use `!`.
- Express 5 route params are typed `string | string[]`: check `typeof x === "string"`.
- Domain errors are classes (`InsufficientFundsError`, `InvalidBetError`); controllers map them to HTTP. The error body is `{ "error": "..." }` for now (format not final).
- Comments in English, sparse: explain why, not what.

## Working rules

- Never commit `.env` or secrets. `slot_engine_handbook.md`, `slot_engine_learning_context.md` and `CLAUDE.local.md` are local-only and gitignored.
- Stop servers by PID (including the `tsx watch` parent), never with `taskkill /IM node.exe`.
- **Ports:** host ports 8000–8999 are reserved for frontend dev servers — never publish backend services there. In use: API 3000, smoke-test server 3999, Postgres 5432 and Redis 6379 (both 127.0.0.1 only), Centrifugo 9000. Manual multi-instance checks use 3997–3998.
- Do not upgrade dependencies or run `npm audit fix` without asking.
- Destructive database commands (`prisma migrate reset`, dropping tables or volumes) need the user's explicit consent, even on the dev database.
- Commit messages in English: a short title plus bullet points.
- OpenAPI docs and Swagger UI are deferred to the final phase.

## Project skills

- `verify` — full check: types, math reference numbers, build, HTTP flow.
- `new-game` — add a slot game on the existing engine.
- `math-profile` — create or tune a paytable / reel strips for a target RTP and volatility.
