import type { Wallet } from "../platform/wallet/Wallet.js";
import { InternalWallet } from "../platform/wallet/InternalWallet.js";
import { SessionService } from "../platform/sessions/SessionService.js";
import { config } from "./config.js";

// Composition root: one wallet and one session service shared by all games.
export const wallet: Wallet = new InternalWallet();

export const sessions = new SessionService(
  config.sessionJwtSecret,
  config.sessionTtlSeconds,
);
