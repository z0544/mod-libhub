import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const itemCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  shortGuide: z.string().optional().nullable(),
  exampleCode: z.string().optional().nullable(),
});

export const itemUpdateSchema = itemCreateSchema.partial();

// Multipart fields arrive as strings; coerce/parse accordingly.
export const versionCreateSchema = z.object({
  versionName: z.string().min(1).max(100),
  releaseDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  isRecommended: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true"),
  notes: z.string().optional().nullable(),
  exampleCode: z.string().optional().nullable(),
  metadata: z
    .string()
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "metadata must be valid JSON" });
        return z.NEVER;
      }
    }),
});

export const versionUpdateSchema = z.object({
  versionName: z.string().min(1).max(100).optional(),
  releaseDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v ? new Date(v) : null)),
  isRecommended: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  exampleCode: z.string().optional().nullable(),
  metadata: z.any().optional(),
});

export const itemQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  stable: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  sort: z.enum(["recent", "popular", "title"]).optional().default("recent"),
  from: z.string().optional(),
  to: z.string().optional(),
});
