import { createHash } from "node:crypto";
import type { OperatorConfig } from "./OperatorConfig.js";

export const operators: readonly OperatorConfig[] = [
  {
    operatorId: "democustomer",
    currency: "usd",
    startingBalanceCents: 100_000, // $1,000.00
  },
];

export function findOperator(operatorId: string): OperatorConfig | undefined {
  return operators.find((operator) => operator.operatorId === operatorId);
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
