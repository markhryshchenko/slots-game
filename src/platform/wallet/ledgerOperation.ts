import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { BALANCE_CHANGED, type BalanceChangedEvent } from "../outbox/events.js";
import type { Balance } from "./Wallet.js";
import { InsufficientFundsError, UnknownAccountError } from "./errors.js";

export type LedgerType = "debit" | "credit";
export type Db = Prisma.TransactionClient | PrismaClient;

/**
 * One money operation inside a caller's transaction: atomic balance update,
 * ledger entry and outbox event. Shared by PostgresWallet (one operation per
 * transaction) and the round settler (debit + credit + round in one).
 */
export async function applyLedgerOperation(
  tx: Prisma.TransactionClient,
  playerId: string,
  type: LedgerType,
  amountCents: number,
  roundId: string,
): Promise<Balance> {
  assertPositiveCents(type, amountCents);

  const previous = await tx.ledgerEntry.findUnique({ where: { type_roundId: { type, roundId } } });

  if (previous) {
    return replayLedgerOperation(tx, playerId, type, amountCents, roundId);
  }

  const amount = BigInt(amountCents);

  // Atomic check-and-update in one statement: two parallel bets cannot both
  // see "enough money" — the row lock serialises them, the WHERE re-checks.
  const { count } = await tx.walletAccount.updateMany({
    where: type === "debit" ? { playerId, balanceCents: { gte: amount } } : { playerId },
    data: { balanceCents: type === "debit" ? { decrement: amount } : { increment: amount } },
  });

  if (count === 0) {
    const account = await findAccount(tx, playerId);
    throw new InsufficientFundsError(playerId, toNumber(account.balanceCents), amountCents);
  }

  const account = await findAccount(tx, playerId);

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

/** A retried operation: the same (type, roundId) must match player and amount. */
export async function replayLedgerOperation(
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

  return toBalance(await findAccount(db, playerId));
}

export async function findAccount(db: Db, playerId: string) {
  const account = await db.walletAccount.findUnique({ where: { playerId } });

  if (!account) {
    throw new UnknownAccountError(playerId);
  }

  return account;
}

export function assertPositiveCents(label: string, amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`${label} amount must be a positive integer amount of cents`);
  }
}

export function toBalance(account: { balanceCents: bigint; currency: string }): Balance {
  return { balanceCents: toNumber(account.balanceCents), currency: account.currency };
}

// Cents are BIGINT in the database; the rest of the app uses number, which
// is exact up to 2^53 - 1 cents (about 90 trillion dollars).
export function toNumber(cents: bigint): number {
  const value = Number(cents);

  if (!Number.isSafeInteger(value)) {
    throw new Error(`Amount ${cents} cents is outside the safe integer range`);
  }

  return value;
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
