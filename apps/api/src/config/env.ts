import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const uploadDirRaw = process.env.UPLOAD_DIR ?? "uploads";
const webDistRaw = process.env.WEB_DIST_DIR;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "postgresql://libhub:libhub@localhost:5432/libhub?schema=public"),
  jwtSecret: required("JWT_SECRET", "dev-insecure-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  uploadDir: path.isAbsolute(uploadDirRaw) ? uploadDirRaw : path.resolve(process.cwd(), uploadDirRaw),
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE ?? 2 * 1024 * 1024 * 1024),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // When set, the API also serves the built frontend (single-process deployment).
  webDistDir: webDistRaw
    ? path.isAbsolute(webDistRaw)
      ? webDistRaw
      : path.resolve(process.cwd(), webDistRaw)
    : null,
  seedAdmin: {
    username: process.env.SEED_ADMIN_USERNAME ?? "admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
    fullName: process.env.SEED_ADMIN_FULLNAME ?? "System Administrator",
  },
} as const;

export const isProd = env.nodeEnv === "production";
