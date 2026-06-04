import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDir } from "./lib/storage.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  ensureUploadDir();
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`ModLibHub API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
