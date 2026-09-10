import { parseGospelCitation } from "@/lib/gospel/citation";
import type { GospelBook } from "@/lib/gospel/types";

/** URL slug for a gospel citation, e.g. "Lc 6, 27–38" → "lc-6-27-38". */
export function quoteSlug(reference: string): string {
  return String(reference ?? "")
    .replace(/[–—−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseQuoteSlug(
  slug: string,
): { book: GospelBook; chapter: number; verse: number } | null {
  const match = String(slug ?? "")
    .toLowerCase()
    .match(/^(mt|mc|lc|jn)-(\d+)-(\d+)/);
  if (!match) return null;
  const book = match[1] as GospelBook;
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return { book, chapter, verse };
}

/** Public URL for a verse: /citas/lc/6.35 */
export function quoteSharePath(reference: string): string {
  const parsed = parseGospelCitation(reference);
  const range = parsed?.ranges[0];
  if (parsed && range) {
    return `/citas/${parsed.book}/${range.chapter}.${range.start}`;
  }
  const fromSlug = parseQuoteSlug(quoteSlug(reference));
  if (fromSlug) {
    return `/citas/${fromSlug.book}/${fromSlug.chapter}.${fromSlug.verse}`;
  }
  return `/citas/${quoteSlug(reference)}`;
}
