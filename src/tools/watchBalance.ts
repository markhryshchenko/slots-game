// End-to-end check of the real-time balance: a player subscribes to its
// balance channel over Centrifugo, spins over HTTP and must receive every
// balance change in order; after a dropped connection it must recover the
// missed balance; another player must not be able to subscribe.
// Usage: npm run watch:balance   (API server and Centrifugo must be running)
import { randomUUID } from "node:crypto";
import { Centrifuge, type Subscription } from "centrifuge";

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const GAME_ID = "sevenslice";
const BET_CENTS = 100;
const SPINS = 3;
const TIMEOUT_MS = 5000;

interface Profile {
  playerId: string;
  sessionToken: string;
  realtime: { url: string; token: string; channel: string };
}

interface SpinResponse {
  roundId: string;
  totalWin: number;
  balance: number;
}

interface BalanceUpdate {
  balance: number;
  balanceFloat: number;
  roundId: string;
  reason: "debit" | "credit";
}

let failed = false;

function report(ok: boolean, name: string): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  failed ||= !ok;
}

async function post<T>(path: string, body: unknown, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed: HTTP ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

function openProfile(): Promise<Profile> {
  return post<Profile>("/v1/profile", {
    token: `watch-${randomUUID()}`,
    cid: "democustomer",
    gameId: GAME_ID,
  });
}

function connect(profile: Profile): Promise<Centrifuge> {
  // Node 24 has a built-in WebSocket, so the `ws` package is not needed.
  const client = new Centrifuge(profile.realtime.url, {
    token: profile.realtime.token,
    websocket: WebSocket,
  });

  return new Promise((resolve, reject) => {
    client.on("connected", () => resolve(client));
    client.on("error", (ctx) => reject(new Error(`connection error: ${ctx.error.message}`)));
    client.connect();
  });
}

function subscribe(subscription: Subscription): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("subscribe timeout")), TIMEOUT_MS);

    subscription.on("subscribed", () => {
      clearTimeout(timer);
      resolve();
    });
    subscription.on("unsubscribed", (ctx) => {
      clearTimeout(timer);
      reject(new Error(`unsubscribed: ${ctx.code} ${ctx.reason}`));
    });
    subscription.on("error", (ctx) => {
      clearTimeout(timer);
      reject(new Error(`subscription error: ${ctx.error.code} ${ctx.error.message}`));
    });

    subscription.subscribe();
  });
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const alice = await openProfile();
const bob = await openProfile();

console.log(`player ${alice.playerId.slice(0, 8)}…, channel ${alice.realtime.channel.slice(0, 20)}…`);

const aliceClient = await connect(alice);
const received: BalanceUpdate[] = [];
const aliceSubscription = aliceClient.newSubscription(alice.realtime.channel);

aliceSubscription.on("publication", (ctx) => {
  const update = ctx.data as BalanceUpdate;
  received.push(update);
  console.log(
    `  ws  ${update.reason.padEnd(6)} balance=${update.balance} (${update.balanceFloat}) round=${update.roundId.slice(0, 8)}`,
  );
});

await subscribe(aliceSubscription);
report(true, "player subscribed to its own balance channel");

// Each spin must produce a debit and, on a win, a credit with the same roundId.
const expected: Array<{ roundId: string; reason: BalanceUpdate["reason"] }> = [];
let lastSpin: SpinResponse | undefined;

for (let i = 0; i < SPINS; i++) {
  lastSpin = await post<SpinResponse>(
    `/v1/games/${GAME_ID}/spin`,
    { bet: BET_CENTS },
    alice.sessionToken,
  );
  console.log(`  http spin   balance=${lastSpin.balance} win=${lastSpin.totalWin} round=${lastSpin.roundId.slice(0, 8)}`);

  expected.push({ roundId: lastSpin.roundId, reason: "debit" });

  if (lastSpin.totalWin > 0) {
    expected.push({ roundId: lastSpin.roundId, reason: "credit" });
  }
}

await waitFor(() => received.length >= expected.length);

report(
  received.length === expected.length,
  `received ${received.length} of ${expected.length} balance updates`,
);
report(
  expected.every((step, i) => received[i]?.roundId === step.roundId && received[i]?.reason === step.reason),
  "updates arrived in order: debit, then credit of the same round",
);
report(
  received.at(-1)?.balance === lastSpin?.balance,
  `last pushed balance equals the last spin balance (${lastSpin?.balance})`,
);
report(
  received.length > 0 && received.every((update) => update.balanceFloat === update.balance / 100),
  "every push carries balanceFloat = balance / 100",
);

// Recovery (cache mode, history in Redis): after a dropped connection the
// same client resubscribes with its saved stream position and gets the latest
// balance it missed. A brand-new client has no position and gets nothing from
// history — it takes the starting balance from HTTP (profile / GET /v1/balance).
let recoveredFlag = false;
aliceSubscription.on("subscribed", (ctx) => {
  if (ctx.wasRecovering) recoveredFlag = ctx.recovered;
});

aliceClient.disconnect();

const missedSpin = await post<SpinResponse>(
  `/v1/games/${GAME_ID}/spin`,
  { bet: BET_CENTS },
  alice.sessionToken,
);
console.log(`  http spin   balance=${missedSpin.balance} (while disconnected)`);

// Pushes are queued, not awaited by the spin: give this one time to reach
// Centrifugo, so it is recovered from history rather than received live.
await new Promise((resolve) => setTimeout(resolve, 300));
aliceClient.connect();

await waitFor(() => received.at(-1)?.roundId === missedSpin.roundId);

report(
  recoveredFlag && received.at(-1)?.balance === missedSpin.balance,
  `reconnect recovers the missed balance (recovered=${recoveredFlag}, balance ${received.at(-1)?.balance}, expected ${missedSpin.balance})`,
);

// Security: Bob's token must not open Alice's user-limited channel.
const bobClient = await connect(bob);
const intrusion = bobClient.newSubscription(alice.realtime.channel);
const rejection = await subscribe(intrusion).then(
  () => undefined,
  (error: Error) => error.message,
);
report(rejection !== undefined, `another player cannot subscribe (${rejection ?? "was allowed!"})`);

aliceClient.disconnect();
bobClient.disconnect();

console.log(failed ? "\nREALTIME CHECK FAILED" : "\nREALTIME CHECK PASSED");
process.exit(failed ? 1 : 0);
