import { randomUUID } from "node:crypto";
import type { GameConfig } from "../../games/GameConfig.js";
import type { Session } from "../../platform/sessions/Session.js";
import type { Wallet } from "../../platform/wallet/Wallet.js";
import { SlotMachine } from "../../engines/slot/SlotMachine.js";
import { CryptoRNG } from "../../core/CryptoRNG.js";
import { fromCents } from "../../core/money.js";
import { validateGameConfig } from "../../games/validateGameConfig.js";

export class InvalidBetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBetError";
  }
}

export class GameService {
  private readonly machine: SlotMachine;

  constructor(
    private readonly game: GameConfig,
    private readonly wallet: Wallet,
  ) {
    validateGameConfig(game);
    // Real spins need a CSPRNG: stop positions go to the client, and
    // Math.random's state could be reconstructed from them.
    this.machine = new SlotMachine(game.mathProfile, new CryptoRNG());
  }

  get gameId(): string {
    return this.game.gameId;
  }

  get currency(): string {
    return this.game.currency;
  }

  async spin(session: Session, betCents: number) {
    if (!this.game.betLevels.includes(betCents)) {
      throw new InvalidBetError("Bet is not one of the allowed bet levels");
    }

    if (session.currency !== this.game.currency) {
      throw new InvalidBetError("Session currency does not match the game currency");
    }

    const roundId = randomUUID();

    // Debit first: the reels never spin for a bet that was not paid.
    let balance = await this.wallet.debit(session.playerId, betCents, roundId);

    const result = this.machine.spin(betCents);

    if (result.totalWin > 0) {
      balance = await this.wallet.credit(session.playerId, result.totalWin, roundId);
    }

    return {
      roundId,
      currency: balance.currency,
      bet: betCents,
      totalWin: result.totalWin,
      balance: balance.balanceCents,
      // Human-readable copy for debugging only; clients compute with `balance` (cents).
      balanceFloat: fromCents(balance.balanceCents),
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    };
  }
}
