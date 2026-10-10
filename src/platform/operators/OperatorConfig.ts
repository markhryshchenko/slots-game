export interface OperatorConfig {
  /** Operator id; the client sends it as `cid` (same as Turbo Games). */
  operatorId: string;
  /** ISO 4217, lowercase. One currency per operator for now. */
  currency: string;
  /** Demo balance a new player starts with, in cents. */
  startingBalanceCents: number;
}
