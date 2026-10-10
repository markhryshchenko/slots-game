import type { Wallet } from "../platform/wallet/Wallet.js";
import { PostgresWallet } from "../platform/wallet/PostgresWallet.js";
import { SessionService } from "../platform/sessions/SessionService.js";
import { CentrifugoPublisher } from "../platform/realtime/CentrifugoPublisher.js";
import { OutboxRelay } from "../platform/outbox/OutboxRelay.js";
import { createPrisma } from "../platform/db/createPrisma.js";
import { config } from "./config.js";

// Composition root: one database client, wallet, outbox relay and session
// service shared by all games.
export const prisma = createPrisma(config.databaseUrl);

export const outboxRelay = new OutboxRelay(
  prisma,
  new CentrifugoPublisher(config.centrifugo.apiUrl, config.centrifugo.apiKey),
);

// Money changes and their outbox events commit together; the relay is woken
// right after the commit so pushes are not delayed by its poll interval.
export const wallet: Wallet = new PostgresWallet(prisma, () => outboxRelay.notify());

export const sessions = new SessionService(
  config.sessionJwtSecret,
  config.sessionTtlSeconds,
);
