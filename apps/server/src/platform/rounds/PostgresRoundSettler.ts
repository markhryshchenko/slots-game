import type { GameRound, Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { Balance } from "../wallet/Wallet.js";
import {
  applyLedgerOperation,
  assertPositiveCents,
  findAccount,
  isUniqueViolation,
  toBalance,
  toNumber,
  type Db,
} from "../wallet/ledgerOperation.js";
import type { RoundHistory, RoundRecord, RoundSettlement, RoundSettler } from "./RoundSettler.js";

/**
 * Settles a whole round in ONE transaction: debit, credit (on a win), the
 * round record and the outbox events. A crash can no longer leave a paid bet
 * without its win, or money moved without a record of the round.
 */
export class PostgresRoundSettler implements RoundSettler, RoundHistory {
  constructor(
    private readonly prisma: PrismaClient,
    /** Called after a commit that wrote outbox events (wakes the relay). */
    private readonly onEventsCommitted: () => void = () => {},
  ) {}

  async settle(round: RoundSettlement): Promise<Balance> {
    assertPositiveCents("bet", round.betCents);

    if (!Number.isInteger(round.totalWinCents) || round.totalWinCents < 0) {
      throw new Error("win must be a non-negative integer amount of cents");
    }

    let balance: Balance;

    try {
      balance = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.gameRound.findUnique({ where: { id: round.roundId } });

        if (existing) {
          return this.replay(tx, existing, round);
        }

        let after = await applyLedgerOperation(tx, round.playerId, "debit", round.betCents, round.roundId);

        if (round.totalWinCents > 0) {
          after = await applyLedgerOperation(tx, round.playerId, "credit", round.totalWinCents, round.roundId);
        }

        await tx.gameRound.create({
          data: {
            id: round.roundId,
            playerId: round.playerId,
            operatorId: round.operatorId,
            sessionId: round.sessionId,
            gameId: round.gameId,
            mathProfileId: round.mathProfileId,
            currency: round.currency,
            betCents: BigInt(round.betCents),
            totalWinCents: BigInt(round.totalWinCents),
            balanceAfterCents: BigInt(after.balanceCents),
            maxWinReached: round.maxWinReached,
            stops: toJson(round.stops),
            grid: toJson(round.grid),
            wins: toJson(round.wins),
          },
        });

        return after;
      });
    } catch (error) {
      // A parallel request settled the same round first and ours rolled back.
      if (isUniqueViolation(error)) {
        const existing = await this.prisma.gameRound.findUnique({ where: { id: round.roundId } });

        if (existing) {
          return this.replay(this.prisma, existing, round);
        }
      }

      throw error;
    }

    this.onEventsCommitted();
    return balance;
  }

  async findRound(playerId: string, roundId: string): Promise<RoundRecord | undefined> {
    // Scoped by playerId: another player's round is indistinguishable from a missing one.
    const row = await this.prisma.gameRound.findFirst({ where: { id: roundId, playerId } });
    return row ? toRecord(row) : undefined;
  }

  async listRounds(playerId: string, limit: number): Promise<RoundRecord[]> {
    const rows = await this.prisma.gameRound.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(toRecord);
  }

  /** A retried settlement of an already settled round: nothing moves again. */
  private async replay(db: Db, existing: GameRound, round: RoundSettlement): Promise<Balance> {
    if (existing.playerId !== round.playerId || existing.betCents !== BigInt(round.betCents)) {
      throw new Error(`Conflicting settlement for round ${round.roundId}`);
    }

    return toBalance(await findAccount(db, round.playerId));
  }
}

// Prisma's JSON input type does not accept readonly arrays; the values are
// plain JSON-compatible data (numbers, strings, nested arrays and objects).
function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toRecord(row: GameRound): RoundRecord {
  return {
    roundId: row.id,
    gameId: row.gameId,
    mathProfileId: row.mathProfileId,
    currency: row.currency,
    betCents: toNumber(row.betCents),
    totalWinCents: toNumber(row.totalWinCents),
    balanceAfterCents: toNumber(row.balanceAfterCents),
    maxWinReached: row.maxWinReached,
    stops: row.stops,
    grid: row.grid,
    wins: row.wins,
    createdAt: row.createdAt,
  };
}
