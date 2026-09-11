import { bookToUsfm, isUsfmId } from "./biblia/usfm.ts";
import { parseGospelCitation, parseUsfmCitation } from "./gospel/citation.ts";

/** URL slug for a USFM citation, e.g. "LUK 6, 27–38" → "luk-6-27-38". */
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
): { book: string; chapter: number; verse: number } | null {
  const match = String(slug ?? "")
    .toLowerCase()
    .match(/^([a-z0-9]+)-(\d+)-(\d+)/);
  if (!match) return null;
  const token = match[1] ?? "";
  if (!isUsfmId(token)) return null;
  const book = bookToUsfm(token);
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return { book, chapter, verse };
}

/** Ingest liturgical or USFM text → canonical `LUK 6, 39–42`, or null. */
export function toUsfmReference(reference: string): string | null {
  const parsed = parseGospelCitation(String(reference ?? "").trim());
  return parsed?.display ?? null;
}

/** Public URL for a verse: /citas/LUK/6.35 */
export function quoteSharePath(reference: string): string {
  const parsed = parseUsfmCitation(reference);
  const range = parsed?.ranges[0];
  if (parsed && range) {
    return `/citas/${parsed.usfm}/${range.chapter}.${range.start}`;
  }
  return `/citas/${quoteSlug(reference)}`;
}
