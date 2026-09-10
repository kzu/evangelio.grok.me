/**
 * Pregenerate light-mode OG thumbnails at /citas/[book]/[chapter].[verse].png
 * Usage: node --experimental-strip-types scripts/pregenerate-citas.mts [hch|mt|...]
 * Skips files that already exist.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NT_GOSPELS } from "../src/lib/cita/nt-gospels.ts";
import { quoteOgPng } from "../src/lib/quote-og-png.ts";
import type { CitaBook } from "../src/lib/gospel/types.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const LABEL: Record<string, string> = { mt: "Mt", mc: "Mc", lc: "Lc", jn: "Jn", hch: "Hch" };
const requested = process.argv.slice(2);
const BOOKS = (requested.length ? requested : Object.keys(NT_GOSPELS)) as CitaBook[];

let wrote = 0;
let skipped = 0;
for (const book of BOOKS) {
  const chapters = NT_GOSPELS[book] ?? [];
  for (let chapter = 1; chapter <= chapters.length; chapter++) {
    const verses = chapters[chapter - 1] ?? [];
    for (let n = 1; n <= verses.length; n++) {
      const text = verses[n - 1];
      if (!text) continue;
      const dest = join(PUBLIC, "citas", book, `${chapter}.${n}.png`);
      if (existsSync(dest)) {
        skipped += 1;
        continue;
      }
      const png = quoteOgPng({
        reference: `${LABEL[book] ?? book} ${chapter}, ${n}`,
        body: text,
        theme: "light",
      });
      mkdirSync(join(dest, ".."), { recursive: true });
      writeFileSync(dest, png);
      wrote += 1;
    }
  }
}
console.log(`thumbnails: wrote ${wrote}, skipped ${skipped}`);
