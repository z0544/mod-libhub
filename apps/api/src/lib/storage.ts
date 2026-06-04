import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";

// Ensure the upload directory exists at startup.
export function ensureUploadDir(): void {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

// Allowed file extensions for software/library distribution.
const ALLOWED_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".7z",
  ".rar",
  ".exe",
  ".msi",
  ".dmg",
  ".pkg",
  ".deb",
  ".rpm",
  ".jar",
  ".whl",
  ".nupkg",
  ".iso",
  ".bin",
  ".appimage",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, unique);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadSize },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${ext || "unknown"}" is not allowed`));
    }
  },
});

export function resolveStoredPath(storedFileName: string): string {
  return path.join(env.uploadDir, storedFileName);
}

export function deleteStoredFile(storedFileName: string): void {
  try {
    const full = resolveStoredPath(storedFileName);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  } catch (err) {
    console.error("Failed to delete stored file:", storedFileName, err);
  }
}

export function getDirectorySize(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}
