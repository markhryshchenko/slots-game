import { randomUUID } from "node:crypto";
import type { GameConfig } from "../../games/GameConfig.js";
import type { Session } from "../../platform/sessions/Session.js";
import type { RoundSettler } from "../../platform/rounds/RoundSettler.js";
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
    private readonly settler: RoundSettler,
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

    // The outcome is pure computation. It is settled — debit, credit, round
    // record, notifications — in one transaction and returned only after that
    // commit; if the bet cannot be paid, it is discarded and never shown.
    const result = this.machine.spin(betCents);

    const balance = await this.settler.settle({
      roundId,
      playerId: session.playerId,
      operatorId: session.operatorId,
      sessionId: session.sessionId,
      gameId: this.game.gameId,
      mathProfileId: this.game.mathProfile.id,
      currency: this.game.currency,
      betCents,
      totalWinCents: result.totalWin,
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    });

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
