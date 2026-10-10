import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { BALANCE_CHANGED, type BalanceChangedEvent } from "../outbox/events.js";
import type { Balance, Wallet } from "./Wallet.js";
import { InsufficientFundsError, UnknownAccountError } from "./errors.js";

type LedgerType = "debit" | "credit";
type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Wallet in Postgres. Every debit/credit is one transaction: balance update,
 * ledger entry and outbox event commit together or not at all — so a server
 * crash can lose neither money changes nor the notification about them.
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
    return toBalance(await this.findAccount(this.prisma, playerId));
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
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error(`${type} amount must be a positive integer amount of cents`);
    }

    let balance: Balance;

    try {
      balance = await this.prisma.$transaction((tx) =>
        this.applyInTransaction(tx, playerId, type, amountCents, roundId),
      );
    } catch (error) {
      // A parallel request committed the same (type, roundId) first and our
      // transaction rolled back: this call is a retry of that operation.
      if (isUniqueViolation(error)) {
        return this.replay(this.prisma, playerId, type, amountCents, roundId);
      }

      throw error;
    }

    this.onEventsCommitted();
    return balance;
  }

  private async applyInTransaction(
    tx: Prisma.TransactionClient,
    playerId: string,
    type: LedgerType,
    amountCents: number,
    roundId: string,
  ): Promise<Balance> {
    const previous = await tx.ledgerEntry.findUnique({ where: { type_roundId: { type, roundId } } });

    if (previous) {
      return this.replay(tx, playerId, type, amountCents, roundId);
    }

    const amount = BigInt(amountCents);

    // Atomic check-and-update in one statement: two parallel bets cannot both
    // see "enough money" — the row lock serialises them, the WHERE re-checks.
    const { count } = await tx.walletAccount.updateMany({
      where: type === "debit" ? { playerId, balanceCents: { gte: amount } } : { playerId },
      data: { balanceCents: type === "debit" ? { decrement: amount } : { increment: amount } },
    });

    if (count === 0) {
      const account = await this.findAccount(tx, playerId);
      throw new InsufficientFundsError(playerId, toNumber(account.balanceCents), amountCents);
    }

    const account = await this.findAccount(tx, playerId);

    await tx.ledgerEntry.create({
      data: { playerId, type, amountCents: amount, roundId, balanceAfterCents: account.balanceCents },
    });

    const event: BalanceChangedEvent = {
      playerId,
      balance: toNumber(account.balanceCents),
      currency: account.currency,
      roundId,
      reason: type,
    };

    await tx.outboxMessage.create({ data: { type: BALANCE_CHANGED, payload: { ...event } } });

    return toBalance(account);
  }

  private async replay(
    db: Db,
    playerId: string,
    type: LedgerType,
    amountCents: number,
    roundId: string,
  ): Promise<Balance> {
    const previous = await db.ledgerEntry.findUnique({ where: { type_roundId: { type, roundId } } });

    if (!previous || previous.playerId !== playerId || previous.amountCents !== BigInt(amountCents)) {
      throw new Error(`Conflicting ${type} for round ${roundId}`);
    }

    return toBalance(await this.findAccount(db, playerId));
  }

  private async findAccount(db: Db, playerId: string) {
    const account = await db.walletAccount.findUnique({ where: { playerId } });

    if (!account) {
      throw new UnknownAccountError(playerId);
    }

    return account;
  }
}

function toBalance(account: { balanceCents: bigint; currency: string }): Balance {
  return { balanceCents: toNumber(account.balanceCents), currency: account.currency };
}

// Cents are BIGINT in the database; the rest of the app uses number, which
// is exact up to 2^53 - 1 cents (about 90 trillion dollars).
function toNumber(cents: bigint): number {
  const value = Number(cents);

  if (!Number.isSafeInteger(value)) {
    throw new Error(`Amount ${cents} cents is outside the safe integer range`);
  }

  return value;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
