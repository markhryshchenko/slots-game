export interface Session {
  sessionId: string;
  playerId: string;
  operatorId: string;
  gameId: string;
  currency: string;
  displayName: string;
  /** "<operatorId>@<playerId>" — the player id used in tokens and realtime channels. */
  subject: string;
  expiresAt: Date;
}

export type NewSession = Omit<Session, "sessionId" | "subject" | "expiresAt">;
