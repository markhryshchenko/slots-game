function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }

  return value;
}

function secret(name: string): string {
  const value = required(name);

  // HS256 needs at least a 256-bit key; a short secret can be brute-forced.
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }

  return value;
}

const sessionJwtSecret = secret("SESSION_JWT_SECRET");
const centrifugoTokenSecret = secret("CENTRIFUGO_TOKEN_SECRET");

// Separate secrets: a leaked Centrifugo secret must not allow forging API sessions.
if (sessionJwtSecret === centrifugoTokenSecret) {
  throw new Error("CENTRIFUGO_TOKEN_SECRET must differ from SESSION_JWT_SECRET");
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  sessionJwtSecret,
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 3600),
  centrifugo: {
    apiUrl: process.env.CENTRIFUGO_API_URL ?? "http://localhost:8000/api",
    apiKey: secret("CENTRIFUGO_API_KEY"),
    tokenSecret: centrifugoTokenSecret,
    wsUrl: process.env.CENTRIFUGO_WS_URL ?? "ws://localhost:8000/connection/websocket",
  },
};
