import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAdmin } from "../middleware/auth.js";

export const trashRouter = Router();

// Admin: list everything currently in the recycle bin.
trashRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [categories, items] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: { id: true, name: true, icon: true, deletedAt: true },
      }),
      prisma.item.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          deletedAt: true,
          category: { select: { id: true, name: true, icon: true } },
          _count: { select: { versions: true } },
        },
      }),
    ]);

    res.json({
      categories,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        slug: i.slug,
        deletedAt: i.deletedAt,
        category: i.category,
        versionCount: i._count.versions,
      })),
    });
  })
);
