import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ApiError } from "../lib/errors.js";
import { resolveStoredPath } from "../lib/storage.js";

export const downloadRouter = Router();

// Public: stream a version's file and increment its download counter.
downloadRouter.get(
  "/:versionId",
  asyncHandler(async (req, res) => {
    const versionId = Number(req.params.versionId);
    const version = await prisma.itemVersion.findUnique({
      where: { id: versionId },
      include: { item: { select: { slug: true, title: true, deletedAt: true } } },
    });
    if (!version || version.item.deletedAt) throw ApiError.notFound("Version not found");

    const filePath = resolveStoredPath(path.basename(version.filePath));
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound("File is missing on the server");
    }

    await prisma.itemVersion.update({
      where: { id: versionId },
      data: { downloadCount: { increment: 1 } },
    });

    const downloadName =
      version.fileName ??
      `${version.item.slug}-${version.versionName}${path.extname(version.filePath)}`;

    const stat = fs.statSync(filePath);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  })
);
