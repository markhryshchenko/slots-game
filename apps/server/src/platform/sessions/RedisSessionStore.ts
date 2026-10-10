import type { RedisClient } from "../db/createRedis.js";
import type { Session } from "./Session.js";
import type { SessionStore } from "./SessionStore.js";

const KEY_PREFIX = "session:";
const STRING_FIELDS = ["sessionId", "playerId", "operatorId", "gameId", "currency", "displayName", "subject"] as const;

/**
 * Sessions in Redis, shared by every API instance and kept across restarts.
 * Redis expires the key with the session (SET … EX), so nothing piles up.
 * Money never goes here: a lost session only means a new game launch.
 */
export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: RedisClient) {}

  async save(session: Session, ttlSeconds: number): Promise<void> {
    await this.redis.set(KEY_PREFIX + session.sessionId, JSON.stringify(session), {
      expiration: { type: "EX", value: ttlSeconds },
    });
  }

  async find(sessionId: string): Promise<Session | undefined> {
    const raw = await this.redis.get(KEY_PREFIX + sessionId);
    return raw === null ? undefined : parseSession(raw);
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(KEY_PREFIX + sessionId);
  }
}

// What Redis returns is outside data: a value of the wrong shape is treated
// as no session rather than trusted.
function parseSession(raw: string): Session | undefined {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (!STRING_FIELDS.every((field) => typeof record[field] === "string")) {
    return undefined;
  }

  const expiresAt = typeof record.expiresAt === "string" ? new Date(record.expiresAt) : undefined;

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return undefined;
  }

  return { ...(record as Omit<Session, "expiresAt">), expiresAt };
}
