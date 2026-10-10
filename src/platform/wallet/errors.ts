export class InsufficientFundsError extends Error {
  constructor(
    readonly playerId: string,
    readonly balanceCents: number,
    readonly amountCents: number,
  ) {
    super("Insufficient balance");
    this.name = "InsufficientFundsError";
  }
}

export class UnknownAccountError extends Error {
  constructor(readonly playerId: string) {
    super(`No wallet account for player ${playerId}`);
    this.name = "UnknownAccountError";
  }
}
