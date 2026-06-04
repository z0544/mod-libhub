import "dotenv/config";
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { categories, type LibrarySeed } from "./libraries.js";

const prisma = new PrismaClient();

const UPLOAD_DIR = (() => {
  const raw = process.env.UPLOAD_DIR ?? "uploads";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
})();

const CONCURRENCY = 6;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^@/, "")
    .replace(/[/]/g, "-")
    .replace(/[^a-z0-9\s.-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface PackResult {
  filename: string; // file written into UPLOAD_DIR
  originalName: string; // npm's tarball name
  version: string;
  size: number;
}

// Runs `npm pack <spec>` into the uploads dir and returns metadata.
function npmPack(spec: string): Promise<PackResult> {
  return new Promise((resolve, reject) => {
    // shell:true is required on Windows (Node 22) to spawn npm.cmd without EINVAL.
    execFile(
      "npm",
      ["pack", spec, "--json", "--pack-destination", `"${UPLOAD_DIR}"`, "--no-audit", "--no-fund"],
      { cwd: UPLOAD_DIR, maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr?.trim() || err.message));
          return;
        }
        try {
          const start = stdout.indexOf("[");
          const end = stdout.lastIndexOf("]");
          const json = JSON.parse(stdout.slice(start, end + 1));
          const entry = json[0];
          const originalName: string = entry.filename;
          const onDisk = path.join(UPLOAD_DIR, originalName);
          if (!fs.existsSync(onDisk)) {
            reject(new Error(`npm reported ${originalName} but file is missing`));
            return;
          }
          resolve({
            filename: originalName,
            originalName,
            version: entry.version,
            size: fs.statSync(onDisk).size,
          });
        } catch (parseErr) {
          reject(new Error(`Failed to parse npm pack output: ${(parseErr as Error).message}`));
        }
      }
    );
  });
}

async function ensureAdmin(): Promise<number> {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const fullName = process.env.SEED_ADMIN_FULLNAME ?? "System Administrator";
  const admin = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, password: await bcrypt.hash(password, 10), role: "admin" as Role, fullName },
  });
  return admin.id;
}

async function processPackage(
  lib: LibrarySeed,
  categoryId: number,
  adminId: number
): Promise<"created" | "skipped" | "failed"> {
  const spec = lib.npm ?? lib.title;
  const slug = slugify(lib.title);

  const existing = await prisma.item.findUnique({ where: { slug }, include: { versions: true } });
  if (existing && existing.versions.length > 0) {
    return "skipped";
  }

  const item =
    existing ??
    (await prisma.item.create({
      data: {
        title: lib.title,
        slug,
        categoryId,
        description: lib.desc,
        shortGuide: `## ${lib.title}\n\nהתקנה:\n\n\`\`\`bash\nnpm install ${spec}\n\`\`\``,
        createdById: adminId,
      },
    }));

  try {
    const pack = await npmPack(spec);
    await prisma.itemVersion.create({
      data: {
        itemId: item.id,
        versionName: pack.version,
        releaseDate: new Date(),
        filePath: pack.filename,
        fileName: pack.originalName,
        fileSize: BigInt(pack.size),
        isRecommended: true,
        notes: `גרסה ${pack.version} של החבילה \`${spec}\` (הורדה רשמית מ-npm).`,
        metadata: { npm: spec, source: "npm-registry" },
        uploadedById: adminId,
      },
    });
    return "created";
  } catch (err) {
    console.warn(`  ⚠️  ${spec}: download failed — ${(err as Error).message.split("\n")[0]}`);
    return "failed";
  }
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, size: number) {
  let index = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const adminId = await ensureAdmin();

  const totals = { created: 0, skipped: 0, failed: 0 };
  const failedList: string[] = [];

  // Parent category that groups all NPM sub-categories on the home page.
  const npmParent = await prisma.category.upsert({
    where: { name: "NPM" },
    update: { icon: "📦", description: "ספריות, כלים וחבילות מתוך מאגר NPM", parentId: null },
    create: { name: "NPM", icon: "📦", description: "ספריות, כלים וחבילות מתוך מאגר NPM", createdById: adminId },
  });
  console.log(`📦 Parent category ready: NPM (#${npmParent.id})`);

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, description: cat.description, parentId: npmParent.id },
      create: { name: cat.name, icon: cat.icon, description: cat.description, parentId: npmParent.id, createdById: adminId },
    });
    console.log(`\n📁 ${cat.icon} ${cat.name} (${cat.packages.length} packages)`);

    await runPool(
      cat.packages,
      async (lib) => {
        const result = await processPackage(lib, category.id, adminId);
        totals[result]++;
        if (result === "failed") failedList.push(lib.npm ?? lib.title);
        if (result === "created") console.log(`  ✓ ${lib.title}`);
        if (result === "skipped") console.log(`  · ${lib.title} (already present)`);
      },
      CONCURRENCY
    );
  }

  console.log(`\n=== Done ===`);
  console.log(`Created: ${totals.created} | Skipped: ${totals.skipped} | Failed: ${totals.failed}`);
  if (failedList.length) {
    console.log(`Failed packages (catalog entry kept, no file): ${failedList.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
