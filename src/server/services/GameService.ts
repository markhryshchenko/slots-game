import { randomUUID } from "node:crypto";
import type { GameConfig } from "../../games/GameConfig.js";
import type { Session } from "../../platform/sessions/Session.js";
import type { Wallet } from "../../platform/wallet/Wallet.js";
import { SlotMachine } from "../../engines/slot/SlotMachine.js";
import { MathRNG } from "../../core/MathRNG.js";
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
    this.machine = new SlotMachine(game.mathProfile, new MathRNG());
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
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    };
  }
}
