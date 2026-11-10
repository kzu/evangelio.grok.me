import { toUsfmSlug } from "./quote-ref.ts";

/** Turn "Mateo 7:16-20" into the liturgical form the citation parser already knows. */
export function normalizeVerseQuery(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^(?:evangelio\s+seg[uú]n\s+)?(?:san\s+)?/i, "")
    .replace(/(\d)\s*:\s*(\d)/g, "$1,$2")
    .replace(/[–—−]/g, "-")
    .replace(/;/g, ".");
}

/** Gospel + chapter + verse, including ranges (`Mateo 7:16`, `Mateo 7:16-20`). */
export function parseVerseQuery(raw: string): string | null {
  const text = normalizeVerseQuery(raw);
  if (!text) return null;
  return toUsfmSlug(text);
}
