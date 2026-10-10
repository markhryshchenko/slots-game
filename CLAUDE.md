# CLAUDE.md

Slot game platform of the provider **Cardano Play**. First game: **Seven Slice** (classic fruit slot, 3×3, 5 paylines). TypeScript, Express 5, Node 24 LTS.

The whole design is **server-authoritative**: only the server decides a spin outcome and moves money. A client only renders results.

## Commands

```bash
nvm use                 # Node version from .nvmrc (24.x); engines: node >= 24
cp .env.example .env    # then fill the secrets (each >= 32 chars)
docker compose up -d              # Redis + Centrifugo (real-time on :8000, admin UI there too)

npm run dev             # API on :3000 with watch (loads .env)
npm run watch:balance   # end-to-end check of balance pushes over Centrifugo
npm run sandbox         # math sandbox: demo spin, exact analyzer, Monte Carlo
npm run typecheck       # tsc --noEmit
npm run build           # compile src/ → dist/
npm start               # run dist/server/server.js (loads .env)
```

Full check before "done" or a commit: the `verify` skill (`bash .claude/skills/verify/smoke.sh`).

## Layout and dependency rules

```text
src/core/             RNG, MathRNG, money — shared by every future engine
src/engines/slot/     slot mechanics: SlotMachine, Reel, createGrid, WinEvaluator, createBet
src/engines/slot/analysis/  MathAnalyzer (exact), ReelAnalyzer
src/games/            GameConfig, validateGameConfig, registry.ts (the only place a game is registered)
src/games/<gameId>/   config.ts, symbols.ts, math/<profile>.ts — data only, no logic
src/platform/         operators, wallet (Wallet port + InternalWallet), sessions,
                      realtime (RealtimePublisher port, CentrifugoPublisher, PublishingWallet)
src/tools/            dev tools, e.g. watchBalance.ts
centrifugo/config.json, docker-compose.yml   real-time infrastructure: Centrifugo on a Redis engine (no secrets in git)
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

- **Money:** integer minor units (cents) plus a lowercase ISO 4217 currency, Stripe-style, in the engine, the wallet and the API. No floats for money. `fromCents` is only for human-readable reports. Only 2-decimal currencies are supported so far.
- **Bets:** only values from the game's `betLevels`. `createBet` rejects bets not divisible by the paylines count instead of rounding.
- **Spin order:** `wallet.debit` before the spin, `wallet.credit` with the same `roundId` after a win.
- **Wallet:** the balance belongs to the player, not the game. Debit and credit are idempotent per `roundId`; the ledger is append-only.
- **Symbols belong to the game.** The engine treats them as strings; profiles are typed `MathConfig<GameSymbol>` so typos fail to compile.
- **Math profiles are certified artifacts.** They live as TS files in git. Never change a live profile silently; create a new profile id and verify it with `MathAnalyzer` and `MathSimulator` (skill `math-profile`).
- **RNG:** behind the `RNG` interface; `Math.random` (`MathRNG`) is for learning only.
- **Sessions:** JWT (HS256, `jose`) with `sub = <operatorId>@<playerId>`, `sid` and `exp`, backed by a server-side session. Secrets come from env, never from code.
- **Real-time balance:** Centrifugo only delivers; the wallet is the source of truth. `PublishingWallet` pushes `{balance, currency, roundId, reason}` to the user-limited channel `balance#<playerId>` after every debit/credit — queued in order, never awaited by the spin, failures only logged. `playerId` must be unique across the platform. The Centrifugo connection token has its own secret (`CENTRIFUGO_TOKEN_SECRET`), which must differ from `SESSION_JWT_SECRET`.
- **Redis** is the Centrifugo engine: a broker between Centrifugo nodes and the channel history. Balance channels use cache recovery (`history_size: 1`), so a client that reconnects gets the latest balance it missed. A brand-new client has nothing to recover and takes its starting balance over HTTP (profile / `GET /v1/balance`). Redis is not exposed to the host. Money never lives in Redis; the ledger goes to Postgres.
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
- Do not upgrade dependencies or run `npm audit fix` without asking.
- Commit messages in English: a short title plus bullet points.
- OpenAPI docs and Swagger UI are deferred to the final phase.

## Project skills

- `verify` — full check: types, math reference numbers, build, HTTP flow.
- `new-game` — add a slot game on the existing engine.
- `math-profile` — create or tune a paytable / reel strips for a target RTP and volatility.
