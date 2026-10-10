// End-to-end check of the real-time balance: a player's connection is
// subscribed to its balance channel server-side (the token's `channels`
// claim), spins over HTTP and must receive every balance change in order;
// after a dropped connection it must recover the missed balance; another
// player must not be able to subscribe; logout must close only its own session.
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
  currencyExponent: number;
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

/** The same launch token opens another session of the same player. */
function openProfile(launchToken = `watch-${randomUUID()}`): Promise<Profile> {
  return post<Profile>("/v1/profile", {
    token: launchToken,
    cid: "democustomer",
    gameId: GAME_ID,
  });
}

function spin(profile: Profile): Promise<SpinResponse> {
  return post<SpinResponse>(`/v1/games/${GAME_ID}/spin`, { bet: BET_CENTS }, profile.sessionToken);
}

function createClient(profile: Profile): Centrifuge {
  // Node 24 has a built-in WebSocket, so the `ws` package is not needed.
  return new Centrifuge(profile.realtime.url, {
    token: profile.realtime.token,
    // The connection token is short-lived; the SDK renews it over the API.
    getToken: () =>
      post<{ token: string }>("/v1/realtime/token", {}, profile.sessionToken).then((r) => r.token),
    websocket: WebSocket,
  });
}

/** Connects and waits until the server-side subscription to `channel` is active. */
function connect(client: Centrifuge, channel: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no server-side subscription to ${channel}`)), TIMEOUT_MS);

    client.on("subscribed", (ctx) => {
      if (ctx.channel === channel) {
        clearTimeout(timer);
        resolve();
      }
    });
    client.on("error", (ctx) => reject(new Error(`connection error: ${ctx.error.message}`)));
    client.connect();
  });
}

/** Collects balance pushes that arrive through the server-side subscription. */
function collect(client: Centrifuge, label: string): BalanceUpdate[] {
  const received: BalanceUpdate[] = [];

  client.on("publication", (ctx) => {
    const update = ctx.data as BalanceUpdate;
    received.push(update);
    console.log(
      `  ws${label} ${update.reason.padEnd(6)} balance=${update.balance} (${update.balanceFloat}) round=${update.roundId.slice(0, 8)}`,
    );
  });

  return received;
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

const aliceLaunchToken = `watch-${randomUUID()}`;
const alice = await openProfile(aliceLaunchToken);
const bob = await openProfile();

console.log(`player ${alice.playerId.slice(0, 8)}…, channel ${alice.realtime.channel.slice(0, 20)}…`);

const aliceClient = createClient(alice);
const received = collect(aliceClient, " ");

await connect(aliceClient, alice.realtime.channel);
report(true, "connection is subscribed to its own balance channel server-side");

// Each spin must produce a debit and, on a win, a credit with the same roundId.
const expected: Array<{ roundId: string; reason: BalanceUpdate["reason"] }> = [];
let lastSpin: SpinResponse | undefined;

for (let i = 0; i < SPINS; i++) {
  lastSpin = await spin(alice);
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
  received.length > 0 && received.every((update) => update.balanceFloat === update.balance / 10 ** alice.currencyExponent),
  `every push carries balanceFloat = balance / 10^${alice.currencyExponent}`,
);

// Recovery (cache mode, history in Redis): after a dropped connection the
// same client resubscribes with its saved stream position and gets the latest
// balance it missed. A brand-new client has no position and gets nothing from
// history — it takes the starting balance from HTTP (profile / GET /v1/balance).
let recoveredFlag = false;
aliceClient.on("subscribed", (ctx) => {
  if (ctx.channel === alice.realtime.channel && ctx.wasRecovering) recoveredFlag = ctx.recovered;
});

aliceClient.disconnect();

const missedSpin = await spin(alice);
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

// Security: the balance namespace is server-side only, so Bob cannot open
// Alice's channel (nor his own) with a client-side subscription.
const bobClient = createClient(bob);
await connect(bobClient, bob.realtime.channel);
const intrusion = bobClient.newSubscription(alice.realtime.channel);
const rejection = await subscribe(intrusion).then(
  () => undefined,
  (error: Error) => error.message,
);
report(rejection !== undefined, `another player cannot subscribe (${rejection ?? "was allowed!"})`);

// Token renewal: a live session gets a fresh, short-lived connection token.
const renewal = await fetch(`${API_URL}/v1/realtime/token`, {
  method: "POST",
  headers: { Authorization: `Bearer ${bob.sessionToken}` },
});
const renewed = (await renewal.json()) as { expiresAt?: string };
const ttlSeconds = renewed.expiresAt ? (Date.parse(renewed.expiresAt) - Date.now()) / 1000 : -1;
report(
  renewal.status === 200 && ttlSeconds > 0 && ttlSeconds <= 300,
  `POST /v1/realtime/token renews a short-lived token (expires in ${Math.round(ttlSeconds)} s)`,
);

// A second launch of the same player: its own session and connection.
const aliceSecond = await openProfile(aliceLaunchToken);
const secondClient = createClient(aliceSecond);
const receivedBySecond = collect(secondClient, "2");
await connect(secondClient, aliceSecond.realtime.channel);
report(
  aliceSecond.playerId === alice.playerId && aliceSecond.sessionToken !== alice.sessionToken,
  "second launch: same player, another session",
);

// Logout closes the first session's connection at once, with a terminal
// code: the SDK must not reconnect, and the revoked session cannot renew the
// token. The second launch of the same player must keep its feed.
let disconnectCode: number | undefined;
aliceClient.on("disconnected", (ctx) => {
  disconnectCode = ctx.code;
});

await fetch(`${API_URL}/v1/logout`, {
  method: "POST",
  headers: { Authorization: `Bearer ${alice.sessionToken}` },
});
await waitFor(() => disconnectCode !== undefined);
// Give a wrongly reconnecting client time to show itself.
await new Promise((resolve) => setTimeout(resolve, 1500));

report(
  disconnectCode === 4501 && aliceClient.state === "disconnected",
  `logout closes the realtime connection without reconnect (code ${disconnectCode}, state ${aliceClient.state})`,
);

const renewalAfterLogout = await fetch(`${API_URL}/v1/realtime/token`, {
  method: "POST",
  headers: { Authorization: `Bearer ${alice.sessionToken}` },
});
report(renewalAfterLogout.status === 401, `token renewal after logout -> ${renewalAfterLogout.status}`);

const spinAfterLogout = await spin(aliceSecond);
await waitFor(() => receivedBySecond.at(-1)?.roundId === spinAfterLogout.roundId);
report(
  secondClient.state === "connected" && receivedBySecond.at(-1)?.balance === spinAfterLogout.balance,
  `the other launch of the player keeps its feed (state ${secondClient.state}, balance ${receivedBySecond.at(-1)?.balance})`,
);

aliceClient.disconnect();
secondClient.disconnect();
bobClient.disconnect();

console.log(failed ? "\nREALTIME CHECK FAILED" : "\nREALTIME CHECK PASSED");
process.exit(failed ? 1 : 0);
