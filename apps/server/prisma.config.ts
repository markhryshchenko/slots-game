// Prisma CLI config (migrate, generate). Node's built-in loader reads .env,
// so no dotenv dependency is needed.
import { defineConfig, env } from "prisma/config";

// The env file lives at the repository root, next to docker-compose.yml.
process.loadEnvFile("../../.env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
