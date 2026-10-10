import type { OutboxMessage, PrismaClient } from "../../generated/prisma/client.js";
import { fromCents } from "../../core/money.js";
import type { RealtimePublisher } from "../realtime/RealtimePublisher.js";
import { balanceChannel } from "../realtime/RealtimePublisher.js";
import { BALANCE_CHANGED, type BalanceChangedEvent } from "./events.js";

export interface OutboxRelayOptions {
  batchSize: number;
  /** Poll interval when idle; a wallet commit wakes the relay earlier. */
  idleMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
  /** After this many failed attempts a message is parked (failedAt) so it cannot block the queue forever. */
  maxAttempts: number;
}

const DEFAULTS: OutboxRelayOptions = {
  batchSize: 100,
  idleMs: 1000,
  retryBaseMs: 500,
  retryMaxMs: 10_000,
  maxAttempts: 20,
};

/**
 * Delivers outbox events in id order, at least once. On start it first
 * drains whatever is left from before a crash. A failed delivery stops the
 * batch (order is preserved) and is retried with exponential backoff.
 * Duplicates are harmless: events carry the absolute balance.
 *
 * One relay per database for now; several instances would need row claiming
 * (SELECT … FOR UPDATE SKIP LOCKED) or a leader.
 */
export class OutboxRelay {
  private readonly options: OutboxRelayOptions;
  private running = false;
  private wake: (() => void) | undefined;
  private pendingWake = false;
  private loopDone: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: RealtimePublisher,
    options: Partial<OutboxRelayOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loopDone = this.loop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.notify();
    await this.loopDone;
  }

  /** Call after a commit that wrote outbox events, to deliver them immediately. */
  notify(): void {
    this.pendingWake = true;
    this.wake?.();
  }

  private async loop(): Promise<void> {
    let failures = 0;

    while (this.running) {
      try {
        const delivered = await this.drainBatch();
        failures = 0;

        if (delivered === this.options.batchSize) continue; // more may be waiting
        await this.sleep(this.options.idleMs);
      } catch (error) {
        failures += 1;
        const delay = Math.min(this.options.retryBaseMs * 2 ** (failures - 1), this.options.retryMaxMs);
        console.warn(`Outbox delivery failed (attempt ${failures}), retry in ${delay} ms: ${(error as Error).message}`);
        await this.sleep(delay, false);
      }
    }
  }

  /** Delivers one batch in order; throws on the first failure. Returns how many were delivered. */
  private async drainBatch(): Promise<number> {
    this.pendingWake = false;

    const batch = await this.prisma.outboxMessage.findMany({
      where: { publishedAt: null, failedAt: null },
      orderBy: { id: "asc" },
      take: this.options.batchSize,
    });

    for (const message of batch) {
      try {
        await this.deliver(message);
      } catch (error) {
        const attempts = message.attempts + 1;
        const parked = attempts >= this.options.maxAttempts;

        await this.prisma.outboxMessage.update({
          where: { id: message.id },
          data: { attempts, lastError: (error as Error).message, ...(parked ? { failedAt: new Date() } : {}) },
        });

        if (parked) {
          console.error(`Outbox message ${message.id} parked after ${attempts} attempts`);
          continue;
        }

        throw error;
      }

      await this.prisma.outboxMessage.update({
        where: { id: message.id },
        data: { publishedAt: new Date(), attempts: message.attempts + 1 },
      });
    }

    return batch.length;
  }

  private async deliver(message: OutboxMessage): Promise<void> {
    if (message.type !== BALANCE_CHANGED) {
      throw new Error(`Unknown outbox event type: ${message.type}`);
    }

    const { playerId, ...update } = message.payload as unknown as BalanceChangedEvent;

    // balanceFloat is a human-readable copy for debugging; it is derived here,
    // not stored in the event, and clients compute with `balance` (cents).
    await this.publisher.publish(balanceChannel(playerId), {
      ...update,
      balanceFloat: fromCents(update.balance),
    });
  }

  /** Waits for `ms`, or less if notify() is called (unless the wait is a backoff). */
  private sleep(ms: number, wakeable = true): Promise<void> {
    if (wakeable && (this.pendingWake || !this.running)) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);

      function done(): void {
        clearTimeout(timer);
        resolve();
      }

      this.wake = wakeable ? done : undefined;
    }).finally(() => {
      this.wake = undefined;
    });
  }
}
