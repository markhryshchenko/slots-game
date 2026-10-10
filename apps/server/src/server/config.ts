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
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  // Secure default: off unless set to exactly "true". Never enable in production.
  demoOperatorEnabled: process.env.DEMO_OPERATOR_ENABLED === "true",
  sessionJwtSecret,
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 3600),
  centrifugo: {
    apiUrl: process.env.CENTRIFUGO_API_URL ?? "http://localhost:9000/api",
    apiKey: secret("CENTRIFUGO_API_KEY"),
    tokenSecret: centrifugoTokenSecret,
    // Short on purpose: Centrifugo cannot revoke a token, so this bounds how
    // long a copied token works after logout. Renewed via POST /v1/realtime/token.
    tokenTtlSeconds: Number(process.env.CENTRIFUGO_TOKEN_TTL_SECONDS ?? 300),
    wsUrl: process.env.CENTRIFUGO_WS_URL ?? "ws://localhost:9000/connection/websocket",
  },
};
