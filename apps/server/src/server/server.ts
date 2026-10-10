import { createApp } from "./app.js";
import { config } from "./config.js";
import { outboxRelay, prisma, redis } from "./platform.js";

// Sessions are in Redis: without it no request could be authenticated.
await redis.connect();

const server = createApp().listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  // Delivers events left over from before a crash, then keeps delivering new ones.
  outboxRelay.start();
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  // Stop taking requests first, then let the relay finish its current batch.
  server.close();
  await outboxRelay.stop();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
