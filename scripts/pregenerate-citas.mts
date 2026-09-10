/**
 * Pregenerate light-mode OG thumbnails at /citas/[book]/[chapter].[verse].png
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NT_GOSPELS } from "../src/lib/cita/nt-gospels.ts";
import { quoteOgPng } from "../src/lib/quote-og-png.ts";
import type { GospelBook } from "../src/lib/gospel/types.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const LABEL: Record<GospelBook, string> = { mt: "Mt", mc: "Mc", lc: "Lc", jn: "Jn" };
const BOOKS = Object.keys(NT_GOSPELS) as GospelBook[];

let count = 0;
for (const book of BOOKS) {
  const chapters = NT_GOSPELS[book];
  for (let chapter = 1; chapter <= chapters.length; chapter++) {
    const verses = chapters[chapter - 1] ?? [];
    for (let n = 1; n <= verses.length; n++) {
      const text = verses[n - 1];
      if (!text) continue;
      const png = quoteOgPng({
        reference: `${LABEL[book]} ${chapter}, ${n}`,
        body: text,
        theme: "light",
      });
      const dest = join(PUBLIC, "citas", book, `${chapter}.${n}.png`);
      mkdirSync(join(dest, ".."), { recursive: true });
      writeFileSync(dest, png);
      count += 1;
    }
  }
}
console.log(`wrote ${count} thumbnails under /citas/[libro]/[cap].[ver].png`);
