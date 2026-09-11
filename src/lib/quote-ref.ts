import { bookToUsfm, citaBookToUsfm, displayUsfmBook, isUsfmId } from "./biblia/usfm.ts";
import { mapCitaThumbPath } from "./cita-thumb.ts";
import { parseGospelCitation } from "./gospel/citation.ts";
import type { CitaBook, GospelVerse, VerseRange } from "./gospel/types.ts";

export { mapCitaThumbPath };

export type UsfmRef = {
  usfm: string;
  ranges: VerseRange[];
  slug: string;
};

/**
 * Public slugs (Spanish liturgical book + USFM numbers):
 *   Mt.5.3
 *   Mt.5.3-12
 *   Lc.23.44-24.3
 * Internal `usfm` remains MAT / LUK / … for JSON lookup.
 */
export function formatUsfmSlug(usfm: string, ranges: VerseRange[]): string {
  const label = displayUsfmBook(usfm);
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  if (!first || !last) return label;
  const end = last.end;
  if (first.chapter === last.chapter) {
    if (first.start === end) return `${label}.${first.chapter}.${first.start}`;
    return `${label}.${first.chapter}.${first.start}-${end}`;
  }
  return `${label}.${first.chapter}.${first.start}-${last.chapter}.${end}`;
}

export function displayUsfmRef(ref: UsfmRef): string {
  const label = displayUsfmBook(ref.usfm);
  const first = ref.ranges[0];
  const last = ref.ranges[ref.ranges.length - 1];
  if (!first || !last) return label;
  if (first.chapter === last.chapter) {
    if (first.start === last.end) return `${label} ${first.chapter}, ${first.start}`;
    return `${label} ${first.chapter}, ${first.start}–${last.end}`;
  }
  return `${label} ${first.chapter}, ${first.start}–${last.chapter}, ${last.end}`;
}

function expandCross(chapter1: number, verse1: number, chapter2: number, verse2: number): VerseRange[] {
  const ranges: VerseRange[] = [{ chapter: chapter1, start: verse1, end: 999 }];
  for (let chapter = chapter1 + 1; chapter < chapter2; chapter += 1) {
    ranges.push({ chapter, start: 1, end: 999 });
  }
  ranges.push({ chapter: chapter2, start: 1, end: verse2 });
  return ranges;
}

/** Parse a public slug. Maps Lc|Mt|Mc|Jn|Hch|Hc (any case) to USFM. */
export function parseUsfmSlug(raw: string): UsfmRef | null {
  const text = String(raw ?? "")
    .trim()
    .replace(/\.png$/i, "");
  const match = text.match(
    /^([A-Za-z][A-Za-z0-9]*)\.(\d+)\.(\d+)(?:-(\d+)(?:\.(\d+))?)?$/i,
  );
  if (!match) return null;
  const usfm = bookToUsfm(match[1] ?? "");
  if (!usfm || !isUsfmId(usfm)) return null;
  const c1 = Number(match[2]);
  const v1 = Number(match[3]);
  if (!Number.isInteger(c1) || !Number.isInteger(v1) || c1 < 1 || v1 < 1) return null;

  let ranges: VerseRange[];
  if (match[5]) {
    const c2 = Number(match[4]);
    const v2 = Number(match[5]);
    if (!Number.isInteger(c2) || !Number.isInteger(v2) || c2 < 1 || v2 < 1) return null;
    if (c2 < c1 || (c2 === c1 && v2 < v1)) return null;
    ranges =
      c1 === c2
        ? [{ chapter: c1, start: v1, end: v2 }]
        : expandCross(c1, v1, c2, v2);
  } else if (match[4]) {
    const v2 = Number(match[4]);
    if (!Number.isInteger(v2) || v2 < v1) return null;
    ranges = [{ chapter: c1, start: v1, end: v2 }];
  } else {
    ranges = [{ chapter: c1, start: v1, end: v1 }];
  }

  return { usfm, ranges, slug: formatUsfmSlug(usfm, ranges) };
}

function rangesFromVerses(verses: Pick<GospelVerse, "chapter" | "number">[]): VerseRange[] {
  const numbered = verses.filter((verse) => verse.number > 0);
  if (!numbered.length) return [];
  const first = numbered[0]!;
  const last = numbered[numbered.length - 1]!;
  if (first.chapter === last.chapter) {
    return [{ chapter: first.chapter, start: first.number, end: last.number }];
  }
  return expandCross(first.chapter, first.number, last.chapter, last.number);
}

/** Ingest liturgical text, USFM prose, or a public slug → canonical slug. */
export function toUsfmSlug(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const fromSlug = parseUsfmSlug(text);
  if (fromSlug) return fromSlug.slug;
  const parsed = parseGospelCitation(text);
  if (!parsed) return null;
  return formatUsfmSlug(parsed.usfm, parsed.ranges);
}

export function toUsfmReference(reference: string): string | null {
  return toUsfmSlug(reference);
}

export function formatUsfmSlugFromCita(
  book: CitaBook | null,
  verses: Pick<GospelVerse, "chapter" | "number">[],
  fallback: string,
): string {
  if (!book) return toUsfmSlug(fallback) ?? fallback;
  const ranges = rangesFromVerses(verses);
  if (!ranges.length) return toUsfmSlug(fallback) ?? fallback;
  return formatUsfmSlug(citaBookToUsfm(book), ranges);
}

export function quoteSlug(reference: string): string {
  return toUsfmSlug(reference) ?? "";
}

export function parseQuoteSlug(slug: string): { book: string; chapter: number; verse: number } | null {
  const parsed = parseUsfmSlug(slug);
  const range = parsed?.ranges[0];
  if (!parsed || !range) return null;
  return { book: parsed.usfm, chapter: range.chapter, verse: range.start };
}

export function firstVerseSlug(ref: UsfmRef): string {
  const range = ref.ranges[0];
  if (!range) return ref.slug;
  return formatUsfmSlug(ref.usfm, [
    { chapter: range.chapter, start: range.start, end: range.start },
  ]);
}

export function quoteSharePath(reference: string): string {
  const slug = toUsfmSlug(reference);
  return slug ? `/biblia/${slug}` : "/citas";
}

/** CDN that serves ignored `public/citas/` thumbs and `public/biblia/` JSON. */
export const EVANGELIO_CDN_ORIGIN = "https://evangelio.groked.cc";
export const CITA_THUMB_ORIGIN = EVANGELIO_CDN_ORIGIN;

/** Absolute book JSON: `https://evangelio.groked.cc/biblia/JHN.json`. */
export function bibliaBookUrl(usfm: string): string {
  const id = usfm.trim().toUpperCase();
  return id ? `${EVANGELIO_CDN_ORIGIN}/biblia/${id}.json` : "";
}

/** Static file / R2 key: `/citas/Mt/5.3.png` (USFM MAT → liturgical Mt). */
export function quotePngAssetPath(ref: UsfmRef): string {
  const range = ref.ranges[0];
  if (!range) return "";
  return `/citas/${displayUsfmBook(ref.usfm)}/${range.chapter}.${range.start}.png`;
}

/** Absolute unfurl URL — first verse: `https://evangelio.groked.cc/citas/Mt/5.3.png`. */
export function quotePngUrl(ref: UsfmRef): string {
  const asset = quotePngAssetPath(ref);
  return asset ? `${CITA_THUMB_ORIGIN}${asset}` : "";
}

/** Public unfurl URL from liturgical text or a slug. */
export function quotePngPath(reference: string): string {
  const parsed = parseUsfmSlug(toUsfmSlug(reference) ?? "");
  return parsed ? quotePngUrl(parsed) : "";
}

export function displayQuoteReference(reference: string): string {
  const parsed = parseUsfmSlug(toUsfmSlug(reference) ?? reference);
  return parsed ? displayUsfmRef(parsed) : reference;
}
