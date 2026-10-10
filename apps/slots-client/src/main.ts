import { Application } from "pixi.js";
import { ApiClient, type LaunchParams } from "./api/ApiClient.js";
import { formatMoney } from "./money/formatMoney.js";
import { BalanceFeed } from "./realtime/BalanceFeed.js";
import { SlotGame } from "./game/SlotGame.js";
import { SlotScene } from "./game/SlotScene.js";
import { Hud } from "./ui/Hud.js";

const GAME_ID = "sevenslice";
const TOKEN_KEY = "sevenslice.demoToken";

// Launch like an operator lobby would: ?token=…&cid=…&currency=…
// Without a token the demo operator gets one remembered per browser, so a
// reload keeps the same demo player and balance.
function launchParams(): LaunchParams {
  const query = new URLSearchParams(location.search);
  const currency = query.get("currency");

  return {
    token: query.get("token") ?? demoToken(),
    cid: query.get("cid") ?? "democustomer",
    gameId: GAME_ID,
    ...(currency ? { currency } : {}),
  };
}

function demoToken(): string {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) return saved;
    const created = `demo-${crypto.randomUUID()}`;
    localStorage.setItem(TOKEN_KEY, created);
    return created;
  } catch {
    return `demo-${crypto.randomUUID()}`;
  }
}

function showFatal(message: string): void {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
    status.classList.add("error");
  }
}

async function main(): Promise<void> {
  const api = new ApiClient();
  const profile = await api.launch(launchParams());
  const [rules, limits] = await Promise.all([api.gameRules(GAME_ID), api.limits()]);

  const currency = { code: profile.currency, exponent: profile.currencyExponent, sign: profile.currencySign };
  const format = (amount: number) => formatMoney(amount, currency);

  const scene = new SlotScene(rules);
  const app = new Application();
  await app.init({ width: scene.widthPx, height: scene.heightPx, background: 0x12101c, antialias: true });
  document.getElementById("stage")?.appendChild(app.canvas);
  app.stage.addChild(scene);
  app.ticker.add((ticker) => scene.update(ticker.deltaMS));

  // `game` is assigned right below; the handlers only run after that.
  let game: SlotGame | undefined;

  const hud = new Hud(limits, format, {
    onSpin: () => void game?.spin(),
    onExit: () => {
      void api.logout().finally(() => game?.end("Logged out."));
    },
  });

  const feed = new BalanceFeed({
    url: profile.realtime.url,
    token: profile.realtime.token,
    channel: profile.realtime.channel,
    getToken: () => api.realtimeToken(),
    onBalance: (balance) => hud.setBalance(balance),
    onSessionEnded: () => game?.end("Session ended."),
  });

  game = new SlotGame(GAME_ID, api, scene, hud, feed);
  hud.setBalance(profile.balance);
  hud.setStatus(`${profile.displayName} · ${profile.currency.toUpperCase()} · ${rules.mathProfileId}`);
  feed.connect();
}

main().catch((error: unknown) => {
  console.error(error);
  showFatal(error instanceof Error ? `Launch failed: ${error.message}` : "Launch failed");
});
