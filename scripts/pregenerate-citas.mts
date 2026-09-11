/**
 * Pregenerate light-mode OG thumbnails at public/citas/[book]/chapter.verse.png
 * Usage:
 *   node --experimental-strip-types scripts/pregenerate-citas.mts [Mt|Jn|…] [--force]
 *   --force         overwrite existing PNGs
 *   --skip-upload   do not prompt / do not upload (used by `npm run build`)
 *   --upload        skip the prompt and upload written files to R2
 *
 * After writing, waits for confirmation before `wrangler r2 bulk put` to bucket evangelio.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NT_GOSPELS } from "../src/lib/cita/nt-gospels.ts";
import { citaBookToUsfm, displayUsfmBook } from "../src/lib/biblia/usfm.ts";
import { quoteOgPng } from "../src/lib/quote-og-png.ts";
import type { CitaBook } from "../src/lib/gospel/types.ts";
import {
  type CitaObject,
  R2_BUCKET,
  citaThumbRel,
  confirmUpload,
  uploadCitasToR2,
} from "./citas-r2.mts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

function parseArgs(argv: string[]): {
  force: boolean;
  skipUpload: boolean;
  upload: boolean;
  requested: string[];
} {
  let force = false;
  let skipUpload = false;
  let upload = false;
  const requested: string[] = [];
  for (const arg of argv) {
    if (arg === "--force") force = true;
    else if (arg === "--skip-upload") skipUpload = true;
    else if (arg === "--upload") upload = true;
    else if (arg.startsWith("-")) {
      throw new Error(`unknown flag: ${arg}`);
    } else requested.push(arg.toLowerCase());
  }
  return { force, skipUpload, upload, requested };
}

const { force, skipUpload, upload, requested } = parseArgs(process.argv.slice(2));
const BOOKS = (Object.keys(NT_GOSPELS) as CitaBook[]).filter((book) => {
  if (!requested.length) return true;
  const usfm = citaBookToUsfm(book);
  const label = displayUsfmBook(usfm).toLowerCase();
  return (
    requested.includes(usfm.toLowerCase()) ||
    requested.includes(book.toLowerCase()) ||
    requested.includes(label)
  );
});

const wrote: CitaObject[] = [];
let skipped = 0;
for (const book of BOOKS) {
  const usfm = citaBookToUsfm(book);
  const label = displayUsfmBook(usfm);
  const chapters = NT_GOSPELS[book] ?? [];
  for (let chapter = 1; chapter <= chapters.length; chapter++) {
    const verses = chapters[chapter - 1] ?? [];
    for (let n = 1; n <= verses.length; n++) {
      const text = verses[n - 1];
      if (!text) continue;
      const rel = citaThumbRel(label, chapter, n);
      const dest = join(PUBLIC, rel);
      if (!force && existsSync(dest)) {
        skipped += 1;
        continue;
      }
      const png = quoteOgPng({
        reference: `${label} ${chapter}, ${n}`,
        body: text,
        theme: "light",
      });
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, png);
      wrote.push({ key: rel.replaceAll("\\", "/"), file: dest });
    }
  }
}
console.log(
  `thumbnails: wrote ${wrote.length}, skipped ${skipped} → public/citas/[libro]/capítulo.versículo.png`,
);

async function maybeUpload(): Promise<void> {
  if (skipUpload) return;
  if (!wrote.length) {
    console.log("R2: no hay miniaturas nuevas para subir");
    return;
  }
  const ok =
    upload ||
    (await confirmUpload(
      `¿Subir ${wrote.length} archivo(s) nuevos a Cloudflare R2 (bucket ${R2_BUCKET})? [s/N] `,
    ));
  if (!ok) {
    console.log("R2: no se subió. Más tarde: npm run upload:citas");
    return;
  }
  await uploadCitasToR2(wrote);
}

await maybeUpload();
