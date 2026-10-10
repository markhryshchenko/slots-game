import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Balance, Wallet } from "./Wallet.js";
import {
  applyLedgerOperation,
  findAccount,
  isUniqueViolation,
  replayLedgerOperation,
  toBalance,
  type LedgerType,
} from "./ledgerOperation.js";

/**
 * Wallet in Postgres. Every debit/credit is one transaction: balance update,
 * ledger entry and outbox event commit together or not at all — so a server
 * crash can lose neither money changes nor the notification about them.
 * A spin settles its whole round atomically via PostgresRoundSettler instead.
 */
export class PostgresWallet implements Wallet {
  constructor(
    private readonly prisma: PrismaClient,
    /** Called after a commit that wrote an outbox event (wakes the relay). */
    private readonly onEventsCommitted: () => void = () => {},
  ) {}

  async openAccount(playerId: string, currency: string, initialCents: number): Promise<Balance> {
    if (!Number.isInteger(initialCents) || initialCents < 0) {
      throw new Error("Initial balance must be a non-negative integer amount of cents");
    }

    const account = await this.prisma.walletAccount.upsert({
      where: { playerId },
      create: { playerId, currency, balanceCents: BigInt(initialCents) },
      update: {},
    });

    return toBalance(account);
  }

  async getBalance(playerId: string): Promise<Balance> {
    return toBalance(await findAccount(this.prisma, playerId));
  }

  debit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    return this.apply(playerId, "debit", amountCents, roundId);
  }

  credit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    return this.apply(playerId, "credit", amountCents, roundId);
  }

  private async apply(
    playerId: string,
    type: LedgerType,
    amountCents: number,
    roundId: string,
  ): Promise<Balance> {
    let balance: Balance;

    try {
      balance = await this.prisma.$transaction((tx) =>
        applyLedgerOperation(tx, playerId, type, amountCents, roundId),
      );
    } catch (error) {
      // A parallel request committed the same (type, roundId) first and our
      // transaction rolled back: this call is a retry of that operation.
      if (isUniqueViolation(error)) {
        return replayLedgerOperation(this.prisma, playerId, type, amountCents, roundId);
      }

      throw error;
    }

    this.onEventsCommitted();
    return balance;
  }
}
