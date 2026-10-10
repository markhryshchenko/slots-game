import { defineConfig } from "vite";

// Host ports 8000–8999 are reserved for frontend dev servers.
// The API is proxied, so the page and the API share one origin in dev:
// no CORS on the server, and the client calls relative URLs (/v1/...).
export default defineConfig({
  server: {
    port: 8080,
    strictPort: true,
    proxy: {
      "/v1": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
