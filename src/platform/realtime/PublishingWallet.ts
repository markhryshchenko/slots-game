import type { Balance, Wallet } from "../wallet/Wallet.js";
import type { RealtimePublisher } from "./RealtimePublisher.js";
import { balanceChannel } from "./RealtimePublisher.js";

export interface BalanceUpdate {
  balance: number;
  currency: string;
  roundId: string;
  reason: "debit" | "credit";
}

/**
 * Decorator: behaves exactly like the wrapped wallet and, after every debit
 * or credit, pushes the new balance to the player's channel.
 *
 * Best-effort: the wallet is the source of truth and the spin response
 * already carries the balance, so a failed push is logged, never thrown.
 * Pushes are queued, not awaited: the spin is not slowed down, and a credit
 * can never overtake the debit before it.
 */
export class PublishingWallet implements Wallet {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly inner: Wallet,
    private readonly publisher: RealtimePublisher,
  ) {}

  openAccount(playerId: string, currency: string, initialCents: number): Promise<Balance> {
    return this.inner.openAccount(playerId, currency, initialCents);
  }

  getBalance(playerId: string): Promise<Balance> {
    return this.inner.getBalance(playerId);
  }

  async debit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    const balance = await this.inner.debit(playerId, amountCents, roundId);
    this.push(playerId, { ...toUpdate(balance, roundId), reason: "debit" });
    return balance;
  }

  async credit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    const balance = await this.inner.credit(playerId, amountCents, roundId);
    this.push(playerId, { ...toUpdate(balance, roundId), reason: "credit" });
    return balance;
  }

  /** Resolves when every queued push has been sent (or has failed). */
  flush(): Promise<void> {
    return this.queue;
  }

  private push(playerId: string, update: BalanceUpdate): void {
    const channel = balanceChannel(playerId);

    this.queue = this.queue
      .then(() => this.publisher.publish(channel, update))
      .catch((error: unknown) => {
        console.warn(`Balance push to ${channel} failed: ${(error as Error).message}`);
      });
  }
}

function toUpdate(balance: Balance, roundId: string): Omit<BalanceUpdate, "reason"> {
  return { balance: balance.balanceCents, currency: balance.currency, roundId };
}
