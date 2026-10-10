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

export const config = {
  port: Number(process.env.PORT ?? 3000),
  sessionJwtSecret: secret("SESSION_JWT_SECRET"),
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 3600),
};
