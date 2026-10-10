import type { Wallet } from "../platform/wallet/Wallet.js";
import { PostgresWallet } from "../platform/wallet/PostgresWallet.js";
import { PostgresRoundSettler } from "../platform/rounds/PostgresRoundSettler.js";
import { SessionService } from "../platform/sessions/SessionService.js";
import { RedisSessionStore } from "../platform/sessions/RedisSessionStore.js";
import { CentrifugoPublisher } from "../platform/realtime/CentrifugoPublisher.js";
import { OutboxRelay } from "../platform/outbox/OutboxRelay.js";
import { createPrisma } from "../platform/db/createPrisma.js";
import { createRedis } from "../platform/db/createRedis.js";
import { config } from "./config.js";

// Composition root: one database client, one Redis client, wallet, outbox
// relay and session service shared by all games.
export const prisma = createPrisma(config.databaseUrl);

// Connected in server.ts before the server starts listening.
export const redis = createRedis(config.redisUrl);

// One Centrifugo API client: the relay publishes through it, logout disconnects.
export const realtime = new CentrifugoPublisher(config.centrifugo.apiUrl, config.centrifugo.apiKey);

export const outboxRelay = new OutboxRelay(prisma, realtime);

// Money changes and their outbox events commit together; the relay is woken
// right after the commit so pushes are not delayed by its poll interval.
export const wallet: Wallet = new PostgresWallet(prisma, () => outboxRelay.notify());

// A spin settles its whole round (debit, credit, round record, events) in one
// transaction; the same object serves the player's round history.
export const rounds = new PostgresRoundSettler(prisma, () => outboxRelay.notify());

// Sessions live in Redis: shared by every API instance and kept across restarts.
export const sessions = new SessionService(
  new RedisSessionStore(redis),
  config.sessionJwtSecret,
  config.sessionTtlSeconds,
);
