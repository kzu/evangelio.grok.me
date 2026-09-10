/**
 * Fetch the four NT gospels from Vatican ESL0506 (Libro del Pueblo de Dios)
 * and write a compact lookup table for /cita/[book]/[chapter].[verse].
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { vaticanChapterUrl } from "../src/lib/gospel/vatican-map.ts";
import type { GospelBook } from "../src/lib/gospel/types.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "src/lib/cita/nt-gospels.ts");
const BOOKS: GospelBook[] = ["mt", "mc", "lc", "jn"];
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function fetchLatin1(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("latin1");
}

function parseChapter(html: string, chapter: number): string[] {
  const $ = load(html);
  const byNumber = new Map<number, string>();
  $("p.MsoNormal").each((_, el) => {
    const raw = collapseWhitespace($(el).text());
    const match = raw.match(/^(\d+)\s+(.*)$/);
    if (!match) return;
    let text = match[2].replace(/^a\s+(?=[A-ZÁÉÍÓÚÑ])/u, "").trim();
    text = text.replace(/\s+([.,;:!?»”])/g, "$1");
    const number = Number(match[1]);
    if (!text || !Number.isInteger(number) || number < 1) return;
    byNumber.set(number, text);
  });
  if (!byNumber.size) {
    throw new Error(`no verses in chapter ${chapter}`);
  }
  const max = Math.max(...byNumber.keys());
  const verses: string[] = [];
  for (let n = 1; n <= max; n++) {
    const text = byNumber.get(n) ?? "";
    if (!text) console.warn(`gap ${chapter},${n}`);
    verses.push(text);
  }
  return verses;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function loadBook(book: GospelBook): Promise<string[][]> {
  const chapters: { chapter: number; url: string }[] = [];
  for (let chapter = 1; ; chapter++) {
    const url = vaticanChapterUrl(book, chapter);
    if (!url) break;
    chapters.push({ chapter, url });
  }
  return mapPool(chapters, 4, async ({ chapter, url }) => {
    const html = await fetchLatin1(url);
    const verses = parseChapter(html, chapter);
    console.log(`${book} ${chapter} → ${verses.length} v`);
    return verses;
  });
}

const data: Record<GospelBook, string[][]> = {
  mt: [],
  mc: [],
  lc: [],
  jn: [],
};

for (const book of BOOKS) {
  data[book] = await loadBook(book);
}

const verses = BOOKS.reduce((sum, book) => sum + data[book].reduce((n, ch) => n + ch.length, 0), 0);
const source = `import type { GospelBook } from "@/lib/gospel/types";

/** Libro del Pueblo de Dios — evangelios NT (Santa Sede, ESL0506). */
export const NT_GOSPELS: Record<GospelBook, string[][]> = ${JSON.stringify(data)};
`;
writeFileSync(OUT, source);
console.log(`wrote ${OUT} (${verses} verses, ${source.length} bytes)`);
