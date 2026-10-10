import { createHash } from "node:crypto";
import type { CurrencyLimits, OperatorConfig } from "./OperatorConfig.js";

// Bet ladders are explicit data, like math profiles: what is written here is
// exactly what a player can bet. The non-usd ladders follow the usd one by a
// fixed factor (jpy ×1 yen per cent, kwd ×3 fils, usdt ×10 000 micro-USDT).
const USD_BET_LEVELS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, // step 5¢ up to $0.50
  75, 100, 125, 150, 175, 200, 225, 250, // step 25¢ up to $2.50
  300, 400, 500, 600, 700, 750, 800, 900, 1000, // $3 – $10
  1250, 1500, 1750, // $12.50 – $17.50
] as const;

const JPY_BET_LEVELS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, // ¥5 – ¥50
  75, 100, 125, 150, 175, 200, 225, 250,
  300, 400, 500, 600, 700, 750, 800, 900, 1000,
  1250, 1500, 1750, // up to ¥1,750
] as const;

const KWD_BET_LEVELS = [
  15, 30, 45, 60, 75, 90, 105, 120, 135, 150, // fils: KD 0.015 – 0.150
  225, 300, 375, 450, 525, 600, 675, 750,
  900, 1200, 1500, 1800, 2100, 2250, 2400, 2700, 3000,
  3750, 4500, 5250, // up to KD 5.250
] as const;

const USDT_BET_LEVELS = [
  50_000, 100_000, 150_000, 200_000, 250_000, // micro-USDT: ₮0.05 – ₮0.25
  300_000, 350_000, 400_000, 450_000, 500_000,
  750_000, 1_000_000, 1_250_000, 1_500_000, 1_750_000, 2_000_000, 2_250_000, 2_500_000,
  3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000, 7_500_000, 8_000_000, 9_000_000, 10_000_000,
  12_500_000, 15_000_000, 17_500_000, // up to ₮17.50
] as const;

export const operators: readonly OperatorConfig[] = [
  {
    operatorId: "democustomer",
    defaultCurrency: "usd",
    currencies: {
      usd: { startingBalance: 100_000, betLevels: USD_BET_LEVELS, defaultBet: 100, maxWin: 25_000_000 }, // $1,000; cap $250,000
      eur: { startingBalance: 100_000, betLevels: USD_BET_LEVELS, defaultBet: 100, maxWin: 25_000_000 }, // €1,000; cap €250,000
      jpy: { startingBalance: 150_000, betLevels: JPY_BET_LEVELS, defaultBet: 100, maxWin: 37_500_000 }, // ¥150,000; cap ¥37.5M
      kwd: { startingBalance: 300_000, betLevels: KWD_BET_LEVELS, defaultBet: 300, maxWin: 75_000_000 }, // KD 300; cap KD 75,000
      usdt: {
        startingBalance: 1_000_000_000, // ₮1,000
        betLevels: USDT_BET_LEVELS,
        defaultBet: 1_000_000,
        maxWin: 250_000_000_000, // ₮250,000
      },
    },
    demo: true,
  },
];

/** A disabled demo operator is reported as unknown, so its existence is not revealed. */
export function findOperator(
  operatorId: string,
  options: { allowDemo: boolean },
): OperatorConfig | undefined {
  return operators.find(
    (operator) => operator.operatorId === operatorId && (options.allowDemo || !operator.demo),
  );
}

/** Limits of an operator in a currency, or undefined if the operator does not support it. */
export function findLimits(
  operator: OperatorConfig,
  currency: string,
): CurrencyLimits | undefined {
  return Object.hasOwn(operator.currencies, currency) ? operator.currencies[currency] : undefined;
}

/** Limits of an open session: its operator and currency were checked at launch. */
export function getSessionLimits(operatorId: string, currency: string): CurrencyLimits {
  const operator = operators.find((candidate) => candidate.operatorId === operatorId);
  const limits = operator ? findLimits(operator, currency) : undefined;

  if (!limits) {
    throw new Error(`No limits for operator ${operatorId} in ${currency}`);
  }

  return limits;
}

export interface OperatorPlayer {
  playerId: string;
  displayName: string;
}

// Stub of the operator's launch-token check. A real operator verifies the
// token on its side; here any non-empty token maps to a stable player, so
// reopening the game with the same token keeps the same balance.
export function resolvePlayer(
  operator: OperatorConfig,
  launchToken: string,
): OperatorPlayer {
  const playerId = createHash("sha256")
    .update(`${operator.operatorId}:${launchToken}`)
    .digest("hex")
    .slice(0, 32);

  return {
    playerId,
    displayName: `Player ${playerId.slice(0, 4).toUpperCase()}`,
  };
}
