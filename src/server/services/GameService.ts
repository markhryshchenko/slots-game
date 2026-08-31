import { SlotMachine } from "../../game/SlotMachine.js";
import { MathRNG } from "../../game/MathRNG.js";
import { rtp96LowVolatility } from "../../game/math/rtp96LowVolatility.js";
import { fromCents, toCents } from "../../game/money.js";

export class GameService {
  private readonly machine: SlotMachine;
  private balanceCents: number;

  constructor() {
    this.machine = new SlotMachine(rtp96LowVolatility, new MathRNG());
    this.balanceCents = toCents(1000); // demo starting balance
  }

  spin(bet: number) {
    const betCents = toCents(bet);

    if (betCents <= 0) {
      throw new Error("Bet must be greater than zero");
    }

    if (betCents > this.balanceCents) {
      throw new Error("Insufficient balance");
    }

    const result = this.machine.spin(bet);

    this.balanceCents = this.balanceCents - betCents + result.totalWin;

    return {
      spinResult: {
        stops: result.stops,
        grid: result.grid,
        wins: result.wins.map((win) => ({
          ...win,
          amount: fromCents(win.amount),
        })),
        totalWin: fromCents(result.totalWin),
      },
      balance: fromCents(this.balanceCents),
    };
  }

  getBalance(): number {
    return fromCents(this.balanceCents);
  }
}

export const gameService = new GameService();
