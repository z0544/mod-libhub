import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ApiError } from "../lib/errors.js";
import { requireAdmin } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { slugify } from "../lib/slug.js";
import { upload, deleteStoredFile } from "../lib/storage.js";
import { itemCreateSchema, itemUpdateSchema, itemQuerySchema, versionCreateSchema } from "../validators.js";
import path from "node:path";

export const itemsRouter = Router();

// Public: list / search items with filters.
itemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = itemQuerySchema.parse(req.query);

    const where: Prisma.ItemWhereInput = { deletedAt: null };

    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
        { shortGuide: { contains: q.search, mode: "insensitive" } },
      ];
    }

    if (q.category) {
      const asNumber = Number(q.category);
      const target = await prisma.category.findFirst({
        where:
          Number.isInteger(asNumber) && asNumber > 0
            ? { id: asNumber }
            : { name: { equals: q.category, mode: "insensitive" } },
        include: { children: { select: { id: true } } },
      });
      if (target) {
        // Include items in this category or, when it is a parent, any of its children.
        const ids = [target.id, ...target.children.map((c) => c.id)];
        where.categoryId = { in: ids };
      } else {
        where.categoryId = -1; // no match
      }
    }

    if (q.stable) {
      where.versions = { some: { isRecommended: true } };
    }

    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }

    const orderBy: Prisma.ItemOrderByWithRelationInput =
      q.sort === "title" ? { title: "asc" } : { createdAt: "desc" };

    const items = await prisma.item.findMany({
      where,
      orderBy,
      include: {
        category: true,
        versions: { select: { downloadCount: true, isRecommended: true, versionName: true, uploadedAt: true } },
      },
    });

    let mapped = items.map((item) => {
      const totalDownloads = item.versions.reduce((sum, v) => sum + v.downloadCount, 0);
      const recommended = item.versions.find((v) => v.isRecommended);
      const latest = item.versions[0];
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        category: item.category
          ? { id: item.category.id, name: item.category.name, icon: item.category.icon }
          : null,
        versionCount: item.versions.length,
        totalDownloads,
        recommendedVersion: recommended?.versionName ?? latest?.versionName ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    if (q.sort === "popular") {
      mapped = mapped.sort((a, b) => b.totalDownloads - a.totalDownloads);
    }

    res.json(mapped);
  })
);

// Public: item detail by slug.
itemsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const item = await prisma.item.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      include: {
        category: true,
        createdBy: { select: { id: true, username: true, fullName: true } },
        versions: {
          orderBy: [{ isRecommended: "desc" }, { uploadedAt: "desc" }],
          include: { uploadedBy: { select: { id: true, username: true, fullName: true } } },
        },
      },
    });
    if (!item) throw ApiError.notFound("Item not found");
    res.json(item);
  })
);

// Public: list versions for an item by slug.
itemsRouter.get(
  "/:slug/versions",
  asyncHandler(async (req, res) => {
    const item = await prisma.item.findFirst({
      where: { slug: req.params.slug, deletedAt: null },
      select: { id: true },
    });
    if (!item) throw ApiError.notFound("Item not found");
    const versions = await prisma.itemVersion.findMany({
      where: { itemId: item.id },
      orderBy: [{ isRecommended: "desc" }, { uploadedAt: "desc" }],
      include: { uploadedBy: { select: { id: true, username: true, fullName: true } } },
    });
    res.json(versions);
  })
);

// Admin: create item.
itemsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = itemCreateSchema.parse(req.body);
    const slug = (data.slug && data.slug.length > 0 ? slugify(data.slug) : slugify(data.title)) || slugify(data.title);

    const fields = {
      title: data.title,
      categoryId: data.categoryId ?? null,
      description: data.description ?? null,
      shortGuide: data.shortGuide ?? null,
      exampleCode: data.exampleCode ?? null,
    };

    // If the slug belongs to an item in the recycle bin, revive it (and keep its
    // existing versions/files) instead of failing with "already exists".
    const existing = await prisma.item.findUnique({ where: { slug } });
    if (existing) {
      if (!existing.deletedAt) {
        throw ApiError.conflict("An item with that slug already exists");
      }
      const revived = await prisma.item.update({
        where: { id: existing.id },
        data: { ...fields, deletedAt: null },
      });
      await audit({ userId: req.user!.sub, action: "restore-on-create", entityType: "item", entityId: revived.id });
      return res.status(201).json(revived);
    }

    const item = await prisma.item.create({
      data: { ...fields, slug, createdById: req.user!.sub },
    });
    await audit({ userId: req.user!.sub, action: "create", entityType: "item", entityId: item.id });
    res.status(201).json(item);
  })
);

// Admin: update item.
itemsRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = itemUpdateSchema.parse(req.body);
    const updateData: Prisma.ItemUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined && data.slug) updateData.slug = slugify(data.slug);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortGuide !== undefined) updateData.shortGuide = data.shortGuide;
    if (data.exampleCode !== undefined) updateData.exampleCode = data.exampleCode;
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId
        ? { connect: { id: data.categoryId } }
        : { disconnect: true };
    }

    const item = await prisma.item.update({ where: { id }, data: updateData });
    await audit({ userId: req.user!.sub, action: "update", entityType: "item", entityId: id });
    res.json(item);
  })
);

// Admin: soft-delete item (move to recycle bin). Files are kept until purge.
itemsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.item.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: req.user!.sub, action: "soft-delete", entityType: "item", entityId: id });
    res.status(204).end();
  })
);

// Admin: restore item from the recycle bin.
itemsRouter.post(
  "/:id/restore",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.item.update({ where: { id }, data: { deletedAt: null } });
    await audit({ userId: req.user!.sub, action: "restore", entityType: "item", entityId: id });
    res.json(item);
  })
);

// Admin: permanently delete item (cascades versions) and remove stored files.
itemsRouter.delete(
  "/:id/permanent",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const versions = await prisma.itemVersion.findMany({ where: { itemId: id }, select: { filePath: true } });
    await prisma.item.delete({ where: { id } });
    for (const v of versions) {
      deleteStoredFile(path.basename(v.filePath));
    }
    await audit({ userId: req.user!.sub, action: "purge", entityType: "item", entityId: id });
    res.status(204).end();
  })
);

// Admin: upload a new version (multipart file upload).
itemsRouter.post(
  "/:itemId/versions",
  requireAdmin,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const itemId = Number(req.params.itemId);
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) {
      if (req.file) deleteStoredFile(req.file.filename);
      throw ApiError.notFound("Item not found");
    }
    if (!req.file) {
      throw ApiError.badRequest("A file upload is required");
    }

    const data = versionCreateSchema.parse(req.body);

    // If this version is recommended, unset the flag on existing ones.
    if (data.isRecommended) {
      await prisma.itemVersion.updateMany({ where: { itemId }, data: { isRecommended: false } });
    }

    const version = await prisma.itemVersion.create({
      data: {
        itemId,
        versionName: data.versionName,
        releaseDate: data.releaseDate ?? null,
        filePath: req.file.filename,
        fileName: req.file.originalname,
        fileSize: BigInt(req.file.size),
        isRecommended: data.isRecommended ?? false,
        notes: data.notes ?? null,
        exampleCode: data.exampleCode ?? null,
        metadata: (data.metadata ?? undefined) as object | undefined,
        uploadedById: req.user!.sub,
      },
    });

    await prisma.item.update({ where: { id: itemId }, data: { updatedAt: new Date() } });
    await audit({ userId: req.user!.sub, action: "create", entityType: "version", entityId: version.id });
    res.status(201).json(version);
  })
);
