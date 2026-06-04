import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const UPLOAD_DIR = (() => {
  const raw = process.env.UPLOAD_DIR ?? "uploads";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
})();

// Write a small placeholder file so seeded downloads work out of the box.
function writePlaceholder(label: string): { fileName: string; storedName: string; size: number } {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storedName = `seed-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.zip`;
  const full = path.join(UPLOAD_DIR, storedName);
  const content = `LibHub placeholder artifact for ${label}\nGenerated at ${new Date().toISOString()}\n`;
  fs.writeFileSync(full, content);
  const size = fs.statSync(full).size;
  return { fileName: `${label.replace(/\s+/g, "-").toLowerCase()}.zip`, storedName, size };
}

interface VersionSeed {
  versionName: string;
  releaseDate: string;
  isRecommended?: boolean;
  notes?: string;
  downloadCount?: number;
  metadata?: Record<string, unknown>;
}

interface ItemSeed {
  title: string;
  slug: string;
  category: string;
  description: string;
  shortGuide?: string;
  exampleCode?: string;
  versions: VersionSeed[];
}

const CAT_FRONTEND = "פריימוורקים לצד לקוח (Frontend Frameworks)";
const CAT_UI = "ספריות UI (UI Libraries)";
const CAT_BACKEND = "צד שרת וסביבות ריצה (Backend & Runtimes)";
const CAT_DB = "מסדי נתונים (Databases)";
const CAT_IDE = "סביבות פיתוח וכלים (IDEs & Tools)";
const CAT_BUILD = "כלי בנייה ופיתוח (Build & Dev Tools)";

const categories = [
  { name: CAT_FRONTEND, icon: "⚛️", description: "פריימוורקים לפיתוח צד לקוח" },
  { name: CAT_UI, icon: "🎨", description: "ספריות רכיבים ומערכות עיצוב" },
  { name: CAT_BACKEND, icon: "🟢", description: "סביבות ריצה ופריימוורקים לצד שרת" },
  { name: CAT_DB, icon: "🗄️", description: "מנועי מסדי נתונים רלציוניים ו-NoSQL" },
  { name: CAT_IDE, icon: "🛠️", description: "עורכי קוד וכלי פיתוח" },
  { name: CAT_BUILD, icon: "🔨", description: "בנדלרים, ולידטורים וכלי בנייה" },
];

const items: ItemSeed[] = [
  {
    title: "React",
    slug: "react",
    category: CAT_FRONTEND,
    description: "A JavaScript library for building user interfaces.",
    shortGuide:
      "## React\nInstall with `npm install react react-dom`. Use function components and hooks for modern apps.",
    exampleCode: "```tsx\nfunction App() {\n  return <h1>Hello LibHub</h1>;\n}\n```",
    versions: [
      { versionName: "19.2.7", releaseDate: "2025-11-10", isRecommended: true, downloadCount: 1240, notes: "Latest stable release." },
      { versionName: "18.3.1", releaseDate: "2024-04-26", downloadCount: 860 },
    ],
  },
  {
    title: "SAP UI5",
    slug: "sap-ui5",
    category: CAT_UI,
    description: "Enterprise-grade UI toolkit for building business applications.",
    shortGuide: "## SAP UI5\nUse the OpenUI5 runtime for Fiori-style enterprise apps.",
    versions: [{ versionName: "1.148.0", releaseDate: "2025-09-01", isRecommended: true, downloadCount: 310 }],
  },
  {
    title: "Node.js",
    slug: "nodejs",
    category: CAT_BACKEND,
    description: "JavaScript runtime built on Chrome's V8 engine.",
    shortGuide: "## Node.js\nLTS releases are recommended for production environments.",
    versions: [
      { versionName: "22.12.0", releaseDate: "2025-10-15", isRecommended: true, downloadCount: 2100, metadata: { lts: true, codename: "Jod" } },
      { versionName: "20.18.1", releaseDate: "2024-11-20", downloadCount: 1500, metadata: { lts: true } },
    ],
  },
  {
    title: "Express",
    slug: "express",
    category: CAT_BACKEND,
    description: "Fast, unopinionated, minimalist web framework for Node.js.",
    versions: [{ versionName: "4.21.2", releaseDate: "2024-12-01", isRecommended: true, downloadCount: 540 }],
  },
  {
    title: "PostgreSQL",
    slug: "postgresql",
    category: CAT_DB,
    description: "The world's most advanced open source relational database.",
    shortGuide: "## PostgreSQL\nUse version 18.x for the latest performance and JSONB improvements.",
    versions: [{ versionName: "18.1", releaseDate: "2025-11-13", isRecommended: true, downloadCount: 980 }],
  },
  {
    title: "Visual Studio Code",
    slug: "vscode",
    category: CAT_IDE,
    description: "Lightweight but powerful source code editor.",
    versions: [{ versionName: "1.96.0", releaseDate: "2025-12-11", isRecommended: true, downloadCount: 3200 }],
  },
  {
    title: "TanStack Query",
    slug: "tanstack-query",
    category: CAT_BUILD,
    description: "Powerful asynchronous state management for TS/JS.",
    versions: [{ versionName: "5.62.0", releaseDate: "2025-11-28", isRecommended: true, downloadCount: 420 }],
  },
  {
    title: "Prisma",
    slug: "prisma",
    category: CAT_BUILD,
    description: "Next-generation Node.js and TypeScript ORM.",
    versions: [{ versionName: "6.1.0", releaseDate: "2025-12-02", isRecommended: true, downloadCount: 610 }],
  },
  {
    title: "Zod",
    slug: "zod",
    category: CAT_BUILD,
    description: "TypeScript-first schema validation with static type inference.",
    versions: [{ versionName: "3.24.1", releaseDate: "2024-12-15", isRecommended: true, downloadCount: 380 }],
  },
];

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const adminFullName = process.env.SEED_ADMIN_FULLNAME ?? "System Administrator";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { password: passwordHash, role: "admin" as Role, fullName: adminFullName },
    create: { username: adminUsername, password: passwordHash, role: "admin" as Role, fullName: adminFullName },
  });

  // A default viewer account for browsing.
  await prisma.user.upsert({
    where: { username: "viewer" },
    update: {},
    create: {
      username: "viewer",
      password: await bcrypt.hash("Viewer123!", 10),
      role: "viewer" as Role,
      fullName: "Default Viewer",
    },
  });

  console.log(`Admin user ready: ${admin.username}`);

  const categoryMap = new Map<string, number>();
  for (const c of categories) {
    const created = await prisma.category.upsert({
      where: { name: c.name },
      update: { icon: c.icon, description: c.description },
      create: { ...c, createdById: admin.id },
    });
    categoryMap.set(c.name, created.id);
  }
  console.log(`Seeded ${categories.length} categories`);

  for (const itemSeed of items) {
    const existing = await prisma.item.findUnique({ where: { slug: itemSeed.slug } });
    if (existing) {
      console.log(`Item "${itemSeed.slug}" already exists, skipping`);
      continue;
    }

    const item = await prisma.item.create({
      data: {
        title: itemSeed.title,
        slug: itemSeed.slug,
        categoryId: categoryMap.get(itemSeed.category) ?? null,
        description: itemSeed.description,
        shortGuide: itemSeed.shortGuide ?? null,
        exampleCode: itemSeed.exampleCode ?? null,
        createdById: admin.id,
      },
    });

    for (const v of itemSeed.versions) {
      const file = writePlaceholder(`${itemSeed.title} ${v.versionName}`);
      await prisma.itemVersion.create({
        data: {
          itemId: item.id,
          versionName: v.versionName,
          releaseDate: new Date(v.releaseDate),
          filePath: file.storedName,
          fileName: file.fileName,
          fileSize: BigInt(file.size),
          downloadCount: v.downloadCount ?? 0,
          isRecommended: v.isRecommended ?? false,
          notes: v.notes ?? null,
          metadata: (v.metadata ?? undefined) as object | undefined,
          uploadedById: admin.id,
        },
      });
    }
    console.log(`Seeded item "${itemSeed.title}" with ${itemSeed.versions.length} version(s)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
