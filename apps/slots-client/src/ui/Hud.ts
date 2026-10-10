import type { Limits } from "../api/types.js";

export interface HudHandlers {
  onSpin: () => void;
  onExit: () => void;
}

/** DOM panel under the playfield: balance, bet stepper, win, spin and exit. */
export class Hud {
  private readonly balance = element("balance");
  private readonly bet = element("bet");
  private readonly win = element("win");
  private readonly status = element("status");
  private readonly spin = element<HTMLButtonElement>("spin");
  private readonly betDown = element<HTMLButtonElement>("bet-down");
  private readonly betUp = element<HTMLButtonElement>("bet-up");
  private readonly exit = element<HTMLButtonElement>("exit");
  private betIndex: number;
  private busy = false;

  constructor(
    private readonly limits: Limits,
    private readonly format: (amount: number) => string,
    handlers: HudHandlers,
  ) {
    this.betIndex = Math.max(0, limits.betLevels.indexOf(limits.defaultBet));

    this.betDown.addEventListener("click", () => this.stepBet(-1));
    this.betUp.addEventListener("click", () => this.stepBet(1));
    this.spin.addEventListener("click", handlers.onSpin);
    this.exit.addEventListener("click", handlers.onExit);
    document.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !event.repeat && !this.spin.disabled) {
        event.preventDefault();
        handlers.onSpin();
      }
    });

    this.exit.disabled = false;
    this.renderBet();
    this.setBusy(false);
  }

  get currentBet(): number {
    const bet = this.limits.betLevels[this.betIndex];
    if (bet === undefined) throw new Error("No bet levels");
    return bet;
  }

  setBalance(amount: number): void {
    this.balance.textContent = this.format(amount);
  }

  setWin(amount: number | undefined): void {
    this.win.textContent = amount === undefined ? "—" : this.format(amount);
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    this.spin.disabled = busy;
    this.renderBet();
  }

  setStatus(text: string, isError = false): void {
    this.status.textContent = text;
    this.status.classList.toggle("error", isError);
  }

  /** The session is over: nothing can be played any more. */
  disable(): void {
    this.setBusy(true);
    this.betDown.disabled = true;
    this.betUp.disabled = true;
    this.exit.disabled = true;
  }

  private stepBet(step: number): void {
    const next = this.betIndex + step;
    if (this.busy || next < 0 || next >= this.limits.betLevels.length) return;
    this.betIndex = next;
    this.renderBet();
  }

  private renderBet(): void {
    this.bet.textContent = this.format(this.currentBet);
    this.betDown.disabled = this.busy || this.betIndex === 0;
    this.betUp.disabled = this.busy || this.betIndex === this.limits.betLevels.length - 1;
  }
}

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}
