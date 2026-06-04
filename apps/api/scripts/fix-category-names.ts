import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Match by the intact English token (ASCII survived the bad encoding) and
// overwrite with the correct bilingual name. Tokens are unique per category.
const fixes: { match: string; name: string }[] = [
  { match: "(Frontend Frameworks)", name: "פריימוורקים לצד לקוח (Frontend Frameworks)" },
  { match: "(UI Libraries)", name: "ספריות UI (UI Libraries)" },
  { match: "(Backend & Runtimes)", name: "צד שרת וסביבות ריצה (Backend & Runtimes)" },
  { match: "(Databases)", name: "מסדי נתונים (Databases)" },
  { match: "(IDEs & Tools)", name: "סביבות פיתוח וכלים (IDEs & Tools)" },
  { match: "(Build & Dev Tools)", name: "כלי בנייה ופיתוח (Build & Dev Tools)" },
];

async function main() {
  for (const fix of fixes) {
    const target = await prisma.category.findFirst({ where: { name: { contains: fix.match } } });
    if (!target) {
      console.log(`! no category matched "${fix.match}"`);
      continue;
    }
    await prisma.category.update({ where: { id: target.id }, data: { name: fix.name } });
    console.log(`fixed #${target.id} -> ${fix.name}`);
  }

  const all = await prisma.category.findMany({ orderBy: { id: "asc" } });
  const broken = all.filter((c) => c.name.includes("?"));
  console.log(`\nCategories still containing '?': ${broken.length}`);
  for (const c of broken) console.log(`  #${c.id}: ${c.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
