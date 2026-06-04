import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ApiError } from "../lib/errors.js";
import { signToken, verifyPassword, type Role } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema } from "../validators.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.password) {
      throw ApiError.unauthorized("Invalid username or password");
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      throw ApiError.unauthorized("Invalid username or password");
    }

    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role as Role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, username: true, fullName: true, role: true, createdAt: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    res.json(user);
  })
);
