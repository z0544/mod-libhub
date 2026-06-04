import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAdmin } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { getDirectorySize } from "../lib/storage.js";

export const dashboardRouter = Router();

// Admin: overview metrics for the dashboard.
dashboardRouter.get(
  "/stats",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [totalItems, totalCategories, totalVersions, downloadAgg, storageBytes] = await Promise.all([
      prisma.item.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.itemVersion.count({ where: { item: { deletedAt: null } } }),
      prisma.itemVersion.aggregate({ _sum: { downloadCount: true }, where: { item: { deletedAt: null } } }),
      Promise.resolve(getDirectorySize(env.uploadDir)),
    ]);

    const mostDownloaded = await prisma.itemVersion.findMany({
      where: { item: { deletedAt: null } },
      orderBy: { downloadCount: "desc" },
      take: 5,
      include: { item: { select: { id: true, title: true, slug: true } } },
    });

    const recentItems = await prisma.item.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, createdAt: true },
    });

    res.json({
      totalItems,
      totalCategories,
      totalVersions,
      totalDownloads: downloadAgg._sum.downloadCount ?? 0,
      storageBytes,
      mostDownloaded: mostDownloaded.map((v) => ({
        versionId: v.id,
        versionName: v.versionName,
        downloadCount: v.downloadCount,
        item: v.item,
      })),
      recentItems,
    });
  })
);
