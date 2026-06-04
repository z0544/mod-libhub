import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors.js";
import { verifyToken, type JwtPayload } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  // Allow token via query param for direct download links.
  if (typeof req.query.token === "string") {
    return req.query.token;
  }
  return null;
}

// Attaches req.user when a valid token is present. Does not block.
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Ignore invalid token; route guards will reject if needed.
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Admin access required");
  }
  next();
}
