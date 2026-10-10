import { randomUUID } from "node:crypto";
import type { GameConfig } from "../../games/GameConfig.js";
import type { Session } from "../../platform/sessions/Session.js";
import type { RoundSettler } from "../../platform/rounds/RoundSettler.js";
import { SlotMachine } from "../../engines/slot/SlotMachine.js";
import { CryptoRNG } from "../../core/CryptoRNG.js";
import { toDisplayAmount } from "../../platform/currencies/currencies.js";
import { getSessionLimits } from "../../platform/operators/registry.js";
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

  get paylinesCount(): number {
    return this.game.mathProfile.paylines.length;
  }

  async spin(session: Session, bet: number) {
    // Bets and the win cap belong to the operator and the session's currency.
    const limits = getSessionLimits(session.operatorId, session.currency);

    if (!limits.betLevels.includes(bet)) {
      throw new InvalidBetError(`Bet is not one of the allowed bet levels in ${session.currency}`);
    }

    const roundId = randomUUID();

    // The outcome is pure computation. It is settled — debit, credit, round
    // record, notifications — in one transaction and returned only after that
    // commit; if the bet cannot be paid, it is discarded and never shown.
    const result = this.machine.spin(bet);

    // Line wins stay as computed (the replay shows them); only the payout is capped.
    const maxWinReached = result.totalWin > limits.maxWin;
    const totalWin = maxWinReached ? limits.maxWin : result.totalWin;

    const balance = await this.settler.settle({
      roundId,
      playerId: session.playerId,
      operatorId: session.operatorId,
      sessionId: session.sessionId,
      gameId: this.game.gameId,
      mathProfileId: this.game.mathProfile.id,
      currency: session.currency,
      betCents: bet,
      totalWinCents: totalWin,
      maxWinReached,
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    });

    return {
      roundId,
      currency: balance.currency,
      bet,
      totalWin,
      maxWinReached,
      balance: balance.balanceCents,
      // Human-readable copy for debugging only; clients compute with `balance` (minor units).
      balanceFloat: toDisplayAmount(balance.balanceCents, balance.currency),
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    };
  }
}
