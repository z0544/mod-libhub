import { Router } from "express";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ApiError } from "../lib/errors.js";
import { requireAdmin } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { deleteStoredFile } from "../lib/storage.js";
import { versionUpdateSchema } from "../validators.js";

export const versionsRouter = Router();

// Admin: update version metadata.
versionsRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = versionUpdateSchema.parse(req.body);

    const existing = await prisma.itemVersion.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Version not found");

    if (data.isRecommended === true) {
      await prisma.itemVersion.updateMany({
        where: { itemId: existing.itemId, NOT: { id } },
        data: { isRecommended: false },
      });
    }

    const updateData: Prisma.ItemVersionUpdateInput = {};
    if (data.versionName !== undefined) updateData.versionName = data.versionName;
    if (data.releaseDate !== undefined) updateData.releaseDate = data.releaseDate;
    if (data.isRecommended !== undefined) updateData.isRecommended = data.isRecommended;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.exampleCode !== undefined) updateData.exampleCode = data.exampleCode;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

    const version = await prisma.itemVersion.update({ where: { id }, data: updateData });
    await audit({ userId: req.user!.sub, action: "update", entityType: "version", entityId: id });
    res.json(version);
  })
);

// Admin: delete a version and its stored file.
versionsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const version = await prisma.itemVersion.findUnique({ where: { id } });
    if (!version) throw ApiError.notFound("Version not found");

    await prisma.itemVersion.delete({ where: { id } });
    deleteStoredFile(path.basename(version.filePath));
    await audit({ userId: req.user!.sub, action: "delete", entityType: "version", entityId: id });
    res.status(204).end();
  })
);
