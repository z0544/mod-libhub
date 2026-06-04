import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { env } from "./config/env.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { itemsRouter } from "./routes/items.js";
import { versionsRouter } from "./routes/versions.js";
import { downloadRouter } from "./routes/download.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { trashRouter } from "./routes/trash.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(attachUser);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/items", itemsRouter);
  app.use("/api/item-versions", versionsRouter);
  app.use("/api/download", downloadRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/trash", trashRouter);

  // Production single-process mode: serve the built frontend from the same server.
  // The frontend calls /api on the same origin, so no CORS/proxy is needed.
  if (env.webDistDir && fs.existsSync(env.webDistDir)) {
    const indexHtml = path.join(env.webDistDir, "index.html");
    app.use(express.static(env.webDistDir));
    // SPA fallback for any non-API GET route.
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(indexHtml);
    });
    console.log(`Serving frontend from ${env.webDistDir}`);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
