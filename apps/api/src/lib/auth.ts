import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type Role = "viewer" | "admin";

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  const options = { expiresIn: env.jwtExpiresIn } as jwt.SignOptions;
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
}
