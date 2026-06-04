import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "./libraries.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const nodeModules = path.join(repoRoot, "node_modules");

// 1) Catalog set = every npm package present in the ModLibHub catalog.
const catalog = new Set<string>();
for (const cat of categories) {
  for (const lib of cat.packages) catalog.add(lib.npm ?? lib.title);
}
// The 4 packages seeded by prisma/seed.ts (original sample items).
["react", "express", "prisma", "zod"].forEach((p) => catalog.add(p));

// 2) Direct dependencies declared across all package.json files.
const pkgFiles = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "apps/api/package.json"),
  path.join(repoRoot, "apps/web/package.json"),
];
const directDeps = new Set<string>();
for (const f of pkgFiles) {
  const json = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const key of ["dependencies", "devDependencies"]) {
    for (const dep of Object.keys(json[key] ?? {})) directDeps.add(dep);
  }
}

// 3) All top-level packages installed in node_modules (handles @scoped).
const installed = new Set<string>();
if (fs.existsSync(nodeModules)) {
  for (const entry of fs.readdirSync(nodeModules, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) {
      for (const sub of fs.readdirSync(path.join(nodeModules, entry.name), { withFileTypes: true })) {
        if (sub.isDirectory()) installed.add(`${entry.name}/${sub.name}`);
      }
    } else {
      installed.add(entry.name);
    }
  }
}

const isTypes = (p: string) => p.startsWith("@types/");

const directNotInCatalog = [...directDeps].filter((d) => !catalog.has(d)).sort();
const installedNotInCatalog = [...installed].filter((p) => !catalog.has(p)).sort();
const catalogNotInstalled = [...catalog].filter((p) => !installed.has(p)).sort();

console.log("=== ModLibHub catalog audit ===");
console.log(`Catalog packages: ${catalog.size}`);
console.log(`Direct dependencies (root+api+web): ${directDeps.size}`);
console.log(`Installed in node_modules (top-level): ${installed.size}`);

console.log(`\n--- DIRECT deps NOT in catalog (${directNotInCatalog.length}) ---`);
console.log("• type defs:", directNotInCatalog.filter(isTypes).join(", ") || "(none)");
console.log("• real libs:", directNotInCatalog.filter((d) => !isTypes(d)).join(", ") || "(none)");

console.log(`\n--- Catalog packages NOT installed locally (${catalogNotInstalled.length}) ---`);
console.log(catalogNotInstalled.join(", ") || "(none)");

console.log(`\n--- node_modules packages NOT in catalog: ${installedNotInCatalog.length} (mostly transitive deps) ---`);
console.log(`(of ${installed.size} installed; ${installed.size - installedNotInCatalog.length} are in the catalog)`);
