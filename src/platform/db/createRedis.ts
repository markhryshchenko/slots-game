import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export function createRedis(url: string): RedisClient {
  const client = createClient({ url });

  // Without a listener an "error" event crashes the process; the client
  // reconnects on its own, and requests fail with an error meanwhile.
  client.on("error", (error: unknown) => {
    console.error("Redis error:", error instanceof Error ? error.message : error);
  });

  return client;
}
