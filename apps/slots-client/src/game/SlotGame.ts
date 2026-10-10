import { ApiError, type ApiClient } from "../api/ApiClient.js";
import type { BalanceFeed } from "../realtime/BalanceFeed.js";
import type { Hud } from "../ui/Hud.js";
import type { SlotScene } from "./SlotScene.js";

type State = "idle" | "spinning" | "showingWin" | "ended";

/** Keeps the reels turning at least this long, so a fast server still reads as a spin. */
const MIN_SPIN_MS = 600;

/**
 * One round on screen. The server decides everything; the client animates
 * the answer and controls when money becomes visible:
 * - while the reels turn, the balance is shown after the bet only;
 * - the win and the final balance appear once the reels have stopped.
 */
export class SlotGame {
  private state: State = "idle";

  constructor(
    private readonly gameId: string,
    private readonly api: ApiClient,
    private readonly scene: SlotScene,
    private readonly hud: Hud,
    private readonly feed: BalanceFeed,
  ) {}

  async spin(): Promise<void> {
    if (this.state !== "idle") return;

    this.state = "spinning";
    const bet = this.hud.currentBet;
    this.hud.setBusy(true);
    this.hud.setWin(undefined);
    this.hud.setStatus("");
    this.feed.beginRound();
    const before = this.scene.visibleGrid();
    this.scene.start();

    const minSpin = delay(MIN_SPIN_MS);

    try {
      const result = await this.api.spin(this.gameId, bet);
      this.feed.markOwnRound(result.roundId);
      this.hud.setBalance(result.balance - result.totalWin);

      await minSpin;
      await this.scene.stopOn(result.grid);

      this.state = "showingWin";
      this.scene.showWins(result.wins);
      this.hud.setWin(result.totalWin);
      this.hud.setBalance(result.balance);

      if (result.maxWinReached) this.hud.setStatus("Max win reached");
    } catch (error) {
      const ended = await this.recover(error, before);
      if (ended) return;
    }

    this.feed.endRound();
    this.state = "idle";
    this.hud.setBusy(false);
  }

  /** Logout here or elsewhere: the session is gone, so is the game. */
  end(message: string): void {
    this.state = "ended";
    this.feed.disconnect();
    this.hud.disable();
    this.hud.setStatus(message);
  }

  /** Returns true when the session is over and the game has ended. */
  private async recover(error: unknown, before: string[][]): Promise<boolean> {
    // No outcome to show: put the reels back where they were.
    await this.scene.stopOn(before);

    if (error instanceof ApiError && error.status === 401) {
      this.end("Session ended. Relaunch the game.");
      return true;
    }

    this.hud.setStatus(error instanceof Error ? error.message : "Spin failed", true);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
