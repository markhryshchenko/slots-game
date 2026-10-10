import { randomUUID } from "node:crypto";
import type { Balance, Wallet } from "./Wallet.js";
import { InsufficientFundsError, UnknownAccountError } from "./errors.js";

interface Account {
  balanceCents: number;
  currency: string;
}

export interface LedgerEntry {
  id: string;
  playerId: string;
  type: "debit" | "credit";
  amountCents: number;
  roundId: string;
  balanceAfterCents: number;
  createdAt: Date;
}

/**
 * Our own wallet (own casino or demo), kept in memory until Postgres.
 * Every change is an immutable ledger entry, so each cent can be traced.
 */
export class InternalWallet implements Wallet {
  private readonly accounts = new Map<string, Account>();
  private readonly ledger: LedgerEntry[] = [];
  private readonly entriesByOperation = new Map<string, LedgerEntry>();

  async openAccount(
    playerId: string,
    currency: string,
    initialCents: number,
  ): Promise<Balance> {
    const existing = this.accounts.get(playerId);

    if (existing) {
      return toBalance(existing);
    }

    if (!Number.isInteger(initialCents) || initialCents < 0) {
      throw new Error("Initial balance must be a non-negative integer amount of cents");
    }

    const account = { balanceCents: initialCents, currency };
    this.accounts.set(playerId, account);

    return toBalance(account);
  }

  async getBalance(playerId: string): Promise<Balance> {
    return toBalance(this.getAccount(playerId));
  }

  async debit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    return this.apply(playerId, "debit", amountCents, roundId);
  }

  async credit(playerId: string, amountCents: number, roundId: string): Promise<Balance> {
    return this.apply(playerId, "credit", amountCents, roundId);
  }

  getLedger(playerId: string): readonly LedgerEntry[] {
    return this.ledger.filter((entry) => entry.playerId === playerId);
  }

  // Synchronous on purpose: between the balance check and the update no other
  // request can run, so two parallel bets cannot both spend the same money.
  // With Postgres the same guarantee needs a transaction with a row lock.
  private apply(
    playerId: string,
    type: LedgerEntry["type"],
    amountCents: number,
    roundId: string,
  ): Balance {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error(`${type} amount must be a positive integer amount of cents`);
    }

    const account = this.getAccount(playerId);
    const operationKey = `${type}:${roundId}`;
    const previous = this.entriesByOperation.get(operationKey);

    if (previous) {
      // A retry of an operation that already happened: do not apply it again.
      if (previous.playerId !== playerId || previous.amountCents !== amountCents) {
        throw new Error(`Conflicting ${type} for round ${roundId}`);
      }

      return toBalance(account);
    }

    if (type === "debit" && account.balanceCents < amountCents) {
      throw new InsufficientFundsError(playerId, account.balanceCents, amountCents);
    }

    account.balanceCents += type === "debit" ? -amountCents : amountCents;

    const entry: LedgerEntry = Object.freeze({
      id: randomUUID(),
      playerId,
      type,
      amountCents,
      roundId,
      balanceAfterCents: account.balanceCents,
      createdAt: new Date(),
    });

    this.ledger.push(entry);
    this.entriesByOperation.set(operationKey, entry);

    return toBalance(account);
  }

  private getAccount(playerId: string): Account {
    const account = this.accounts.get(playerId);

    if (!account) {
      throw new UnknownAccountError(playerId);
    }

    return account;
  }
}

function toBalance(account: Account): Balance {
  return { balanceCents: account.balanceCents, currency: account.currency };
}
