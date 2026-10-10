import { findCurrency } from "../currencies/currencies.js";
import type { OperatorConfig } from "./OperatorConfig.js";

/**
 * Fails fast at server start, so a typo in limits never reaches a player's bet.
 * `paylineCounts` holds the paylines count of every registered game: a bet
 * level must split evenly into line bets in each of them.
 */
export function validateOperatorConfig(
  operator: OperatorConfig,
  paylineCounts: readonly number[],
): void {
  const id = operator.operatorId;
  const codes = Object.keys(operator.currencies);

  if (codes.length === 0) {
    throw new Error(`${id}: currencies must not be empty`);
  }

  if (!codes.includes(operator.defaultCurrency)) {
    throw new Error(`${id}: defaultCurrency ${operator.defaultCurrency} is not in currencies`);
  }

  for (const code of codes) {
    const limits = operator.currencies[code];
    const where = `${id}/${code}`;

    if (!limits) {
      throw new Error(`${where}: limits are missing`);
    }

    if (!findCurrency(code)) {
      throw new Error(`${where}: unknown currency`);
    }

    assertAmount(where, "startingBalance", limits.startingBalance, { allowZero: true });
    assertAmount(where, "maxWin", limits.maxWin);

    if (limits.betLevels.length === 0) {
      throw new Error(`${where}: betLevels must not be empty`);
    }

    limits.betLevels.forEach((level, index) => {
      assertAmount(where, "bet level", level);

      for (const paylines of paylineCounts) {
        if (level % paylines !== 0) {
          throw new Error(`${where}: bet level ${level} must be divisible by ${paylines} paylines`);
        }
      }

      const previous = limits.betLevels[index - 1];

      if (previous !== undefined && level <= previous) {
        throw new Error(`${where}: betLevels must be strictly ascending (${previous} → ${level})`);
      }
    });

    if (!limits.betLevels.includes(limits.defaultBet)) {
      throw new Error(`${where}: defaultBet ${limits.defaultBet} is not one of betLevels`);
    }

    const maxBet = limits.betLevels.at(-1) ?? 0;

    if (limits.maxWin < maxBet) {
      throw new Error(`${where}: maxWin ${limits.maxWin} is below the max bet ${maxBet}`);
    }
  }
}

function assertAmount(
  where: string,
  name: string,
  value: number,
  options: { allowZero?: boolean } = {},
): void {
  const min = options.allowZero ? 0 : 1;

  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(`${where}: ${name} ${value} must be a safe integer >= ${min} in minor units`);
  }
}
