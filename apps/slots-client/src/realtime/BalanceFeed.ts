import { Centrifuge } from "centrifuge";
import type { BalanceUpdate } from "../api/types.js";

export interface BalanceFeedOptions {
  url: string;
  token: string;
  channel: string;
  /** Renews the short-lived connection token over the API. */
  getToken: () => Promise<string>;
  onBalance: (balance: number) => void;
  /** The server ended the session (logout elsewhere, code 4501). */
  onSessionEnded: () => void;
}

/**
 * Live balance over Centrifugo. The subscription is server-side (from the
 * token's `channels` claim), so the client only listens to the connection.
 *
 * Pushes of this client's own rounds are ignored: the spin response already
 * carries the authoritative balance, and showing the push would reveal the
 * win before the reels stop. Pushes of other rounds (another tab, a bonus)
 * are held while a round is on screen and shown when it ends.
 */
export class BalanceFeed {
  private readonly client: Centrifuge;
  private readonly ownRounds = new Set<string>();
  private holding = false;
  private held: BalanceUpdate | undefined;

  constructor(private readonly options: BalanceFeedOptions) {
    this.client = new Centrifuge(options.url, {
      token: options.token,
      getToken: options.getToken,
    });

    this.client.on("publication", (ctx) => {
      if (ctx.channel === options.channel) this.receive(ctx.data as BalanceUpdate);
    });

    this.client.on("disconnected", (ctx) => {
      // Centrifugo application codes 4500–4999 are terminal.
      if (ctx.code === 4501) options.onSessionEnded();
    });
  }

  connect(): void {
    this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  /** A round of this client starts: hold other pushes until it is shown. */
  beginRound(): void {
    this.holding = true;
  }

  /** The spin response arrived: its own pushes are ignored from now on. */
  markOwnRound(roundId: string): void {
    this.ownRounds.add(roundId);
  }

  /** The round is fully shown: release the latest held balance, if any. */
  endRound(): void {
    this.holding = false;

    // A push can beat the spin response, so ownership is checked again here.
    if (this.held && !this.ownRounds.has(this.held.roundId)) {
      this.options.onBalance(this.held.balance);
    }

    this.held = undefined;
  }

  private receive(update: BalanceUpdate): void {
    if (this.ownRounds.has(update.roundId)) return;

    if (this.holding) {
      this.held = update;
    } else {
      this.options.onBalance(update.balance);
    }
  }
}
