import type { Wallet } from "../platform/wallet/Wallet.js";
import { InternalWallet } from "../platform/wallet/InternalWallet.js";
import { SessionService } from "../platform/sessions/SessionService.js";
import { CentrifugoPublisher } from "../platform/realtime/CentrifugoPublisher.js";
import { PublishingWallet } from "../platform/realtime/PublishingWallet.js";
import { config } from "./config.js";

// Composition root: one wallet and one session service shared by all games.
// The wallet is wrapped so every balance change is also pushed to the player.
export const wallet: Wallet = new PublishingWallet(
  new InternalWallet(),
  new CentrifugoPublisher(config.centrifugo.apiUrl, config.centrifugo.apiKey),
);

export const sessions = new SessionService(
  config.sessionJwtSecret,
  config.sessionTtlSeconds,
);
