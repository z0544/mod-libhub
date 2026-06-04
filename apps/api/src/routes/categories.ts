import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ApiError } from "../lib/errors.js";
import { requireAdmin } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { categoryCreateSchema, categoryUpdateSchema } from "../validators.js";

export const categoriesRouter = Router();

// Public: list categories with item counts (excludes soft-deleted).
categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { items: { where: { deletedAt: null } } } } },
    });
    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        description: c.description,
        parentId: c.parentId,
        itemCount: c._count.items,
        createdAt: c.createdAt,
      }))
    );
  })
);

categoriesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = categoryCreateSchema.parse(req.body);

    // If the name belongs to a category sitting in the recycle bin, revive it
    // instead of failing with a confusing "already exists" error.
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) {
      if (!existing.deletedAt) {
        throw ApiError.conflict("A category with that name already exists");
      }
      const revived = await prisma.category.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
      await audit({ userId: req.user!.sub, action: "restore-on-create", entityType: "category", entityId: revived.id });
      return res.status(201).json(revived);
    }

    const category = await prisma.category.create({
      data: { ...data, createdById: req.user!.sub },
    });
    await audit({ userId: req.user!.sub, action: "create", entityType: "category", entityId: category.id });
    res.status(201).json(category);
  })
);

categoriesRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = categoryUpdateSchema.parse(req.body);
    const category = await prisma.category.update({ where: { id }, data });
    await audit({ userId: req.user!.sub, action: "update", entityType: "category", entityId: id });
    res.json(category);
  })
);

// Soft-delete: move the category to the recycle bin.
categoriesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const itemCount = await prisma.item.count({ where: { categoryId: id, deletedAt: null } });
    if (itemCount > 0) {
      throw ApiError.conflict("Cannot delete a category that still has items");
    }
    const childCount = await prisma.category.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) {
      throw ApiError.conflict("Cannot delete a category that still has sub-categories");
    }
    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: req.user!.sub, action: "soft-delete", entityType: "category", entityId: id });
    res.status(204).end();
  })
);

// Restore a category from the recycle bin.
categoriesRouter.post(
  "/:id/restore",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const category = await prisma.category.update({ where: { id }, data: { deletedAt: null } });
    await audit({ userId: req.user!.sub, action: "restore", entityType: "category", entityId: id });
    res.json(category);
  })
);

// Permanently delete a category (only when empty).
categoriesRouter.delete(
  "/:id/permanent",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const itemCount = await prisma.item.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      throw ApiError.conflict("Cannot permanently delete a category that still has items");
    }
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw ApiError.conflict("Cannot permanently delete a category that still has sub-categories");
    }
    await prisma.category.delete({ where: { id } });
    await audit({ userId: req.user!.sub, action: "purge", entityType: "category", entityId: id });
    res.status(204).end();
  })
);
