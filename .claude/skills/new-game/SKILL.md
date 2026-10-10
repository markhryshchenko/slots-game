---
name: new-game
description: Add a new slot game (a new gameId — a reskin, an operator-exclusive title or a new theme) on the existing slot engine, as configuration only. Use when the user wants another game, a custom game for an operator such as 1xbet, or a new symbol set; stop and discuss first if the game needs a mechanic the engine does not have.
---

# New game

On this platform a game is **configuration on top of an engine**, not new code. Use `apps/server/src/games/sevenslice/` as the template.

## Stop condition — check first

The current slot engine supports only:
- a 3×3 grid (`createGrid` has 3 rows);
- line pays for 3-of-a-kind (`WinEvaluator`);
- no wild, no scatter, no features.

If the new game needs anything else (5×3, wild, scatter, ways, free spins, cascades…), **stop and tell the user**. That is an engine change, not a new game, and it needs its own plan.

## Steps

1. **Choose the `gameId`:** lowercase letters and digits, unique in `apps/server/src/games/registry.ts`. It appears in API URLs (`/v1/games/<gameId>/...`) and in the client domain (`<gameId>.cardanoplay.io`), so it should not change later.
2. **`apps/server/src/games/<gameId>/symbols.ts`** — the game's own symbol set:

   ```ts
   export const SYMBOLS = { /* NAME: "NAME", ... */ } as const;
   export type <Game>Symbol = (typeof SYMBOLS)[keyof typeof SYMBOLS];
   ```

3. **`apps/server/src/games/<gameId>/math/<profile>.ts`** — `export const <profile>: MathConfig<<Game>Symbol> = { id, targetRtp, reels, paylines, paytable }`. Build and verify it with the **`math-profile`** skill; never copy another game's numbers without re-verifying.
4. **`apps/server/src/games/<gameId>/config.ts`** — a `GameConfig`:
   - `gameId`;
   - `symbols: Object.values(SYMBOLS)`;
   - `mathProfile`.

   A game has no currency and no bet levels: those are operator limits per currency in `apps/server/src/platform/operators/registry.ts`. Every bet level of every operator must be divisible by the new game's paylines count; if it is not, pick a paylines count that fits the existing ladders or change the ladders on purpose.
5. **Register** one line in `apps/server/src/games/registry.ts`. Nothing in routes, middleware or controllers changes.
6. **Verify:**
   - run the `verify` skill;
   - then start the server and call `POST /v1/profile` with `{"token":"t","cid":"democustomer","gameId":"<gameId>"}`;
   - spin it with the returned `sessionToken`.

   `validateGameConfig` (undeclared symbols, no paylines) and `validateOperatorConfig` (bet levels against the paylines of every game) run at startup, so a server that starts is already a good sign.

## Do not

- Do not touch `apps/server/src/engines/` for a new game.
- Do not import anything from `apps/server/src/server` or `apps/server/src/platform` inside `apps/server/src/games/`.
- Do not reuse another game's `gameId` or symbol type.
