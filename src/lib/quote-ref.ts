import { bookToUsfm, citaBookToUsfm } from "./biblia/usfm.ts";
import { normalizeBook, parseGospelCitation } from "./gospel/citation.ts";
import type { CitaBook } from "./gospel/types.ts";

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
): { book: CitaBook; chapter: number; verse: number } | null {
  const match = String(slug ?? "")
    .toLowerCase()
    .match(/^([a-z0-9]+)-(\d+)-(\d+)/);
  if (!match) return null;
  const book = normalizeBook(match[1] ?? "");
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return { book, chapter, verse };
}

/** `Lc 6, 39–42` → `LUK 6, 39–42`. Idempotent if already USFM. */
export function toUsfmReference(reference: string): string {
  const raw = String(reference ?? "").trim();
  if (!raw) return raw;
  const parsed = parseGospelCitation(raw);
  if (parsed) {
    const rest = parsed.display.replace(/^\S+\s+/, "");
    return rest ? `${citaBookToUsfm(parsed.book)} ${rest}` : citaBookToUsfm(parsed.book);
  }
  const parts = raw.match(/^(\S+)\s+(.+)$/);
  if (!parts) return bookToUsfm(raw) ?? raw;
  const usfm = bookToUsfm(parts[1] ?? "");
  return usfm ? `${usfm} ${parts[2]}` : raw;
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
