import { citaBookToUsfm, isUsfmId } from "../biblia/usfm.ts";
import type { CitaBook, GospelBook, GospelVerse, VerseRange } from "./types";

const BOOK_ALIASES: Record<string, CitaBook> = {
  mt: "mt",
  mateo: "mt",
  matthew: "mt",
  mc: "mc",
  mk: "mc",
  marcos: "mc",
  mark: "mc",
  lc: "lc",
  lk: "lc",
  lucas: "lc",
  luke: "lc",
  jn: "jn",
  juan: "jn",
  john: "jn",
  mat: "mt",
  mrk: "mc",
  luk: "lc",
  jhn: "jn",
  hch: "hch",
  hc: "hch",
  hech: "hch",
  hechos: "hch",
  act: "hch",
  acts: "hch",
  ac: "hch",
};

export const BOOK_NAMES: Record<CitaBook, string> = {
  mt: "san Mateo",
  mc: "san Marcos",
  lc: "san Lucas",
  jn: "san Juan",
  hch: "los Hechos de los Apóstoles",
};

export const BOOK_ABBREV: Record<CitaBook, string> = {
  mt: "Mt",
  mc: "Mc",
  lc: "Lc",
  jn: "Jn",
  hch: "Hch",
};

export const CITA_BOOKS: CitaBook[] = ["mt", "mc", "lc", "jn", "hch"];

export function isGospelBook(value: string): value is GospelBook {
  return value === "mt" || value === "mc" || value === "lc" || value === "jn";
}

export function normalizeBook(raw: string): CitaBook | null {
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return BOOK_ALIASES[key] ?? null;
}

/**
 * Parses liturgical gospel citations such as:
 *   Mt 23,27-32
 *   Mt 21,33-43.45-46
 *   Mt 26,14-27,66
 *   Jn 6,51-58
 *   Lc 1,26-38
 */
export function parseGospelCitation(raw: string): {
  book: CitaBook;
  usfm: string;
  ranges: VerseRange[];
  display: string;
} | null {
  const text = String(raw ?? "")
    .replace(/^Texto del Evangelio\s*/i, "")
    .replace(/[()]/g, "")
    .replace(/^[\s.:;–-]+|[\s.:;–-]+$/g, "")
    .trim();
  const match = text.match(/^([1-3]?\s*[A-Za-záéíóúÁÉÍÓÚñÑ.]+)\s+(.+)$/);
  if (!match) return null;
  const book = normalizeBook(match[1] ?? "");
  if (!book) return null;
  const rest = (match[2] ?? "")
    .replace(/\s+/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[:;]+$/g, "");
  const ranges: VerseRange[] = [];
  let currentChapter: number | null = null;

  for (const rawPart of rest.split(".")) {
    const part = rawPart.replace(/[:;]+$/g, "");
    if (!part) continue;
    const cross = part.match(/^(\d+),(\d+)-(\d+),(\d+)$/);
    if (cross) {
      const chapter1 = Number(cross[1]);
      const verse1 = Number(cross[2]);
      const chapter2 = Number(cross[3]);
      const verse2 = Number(cross[4]);
      ranges.push({ chapter: chapter1, start: verse1, end: 999 });
      for (let chapter = chapter1 + 1; chapter < chapter2; chapter += 1) {
        ranges.push({ chapter, start: 1, end: 999 });
      }
      ranges.push({ chapter: chapter2, start: 1, end: verse2 });
      currentChapter = chapter2;
      continue;
    }
    const chapterRange = part.match(/^(\d+),(\d+)-(\d+)$/);
    if (chapterRange) {
      currentChapter = Number(chapterRange[1]);
      ranges.push({
        chapter: currentChapter,
        start: Number(chapterRange[2]),
        end: Number(chapterRange[3]),
      });
      continue;
    }
    const chapterSingle = part.match(/^(\d+),(\d+)$/);
    if (chapterSingle) {
      currentChapter = Number(chapterSingle[1]);
      const verse = Number(chapterSingle[2]);
      ranges.push({ chapter: currentChapter, start: verse, end: verse });
      continue;
    }
    const verseRange = part.match(/^(\d+)-(\d+)$/);
    if (verseRange && currentChapter) {
      ranges.push({
        chapter: currentChapter,
        start: Number(verseRange[1]),
        end: Number(verseRange[2]),
      });
      continue;
    }
    const verseSingle = part.match(/^(\d+)$/);
    if (verseSingle && currentChapter) {
      const verse = Number(verseSingle[1]);
      ranges.push({ chapter: currentChapter, start: verse, end: verse });
    }
  }

  if (!ranges.length) return null;

  const usfm = citaBookToUsfm(book);
  const display = `${BOOK_ABBREV[book]} ${rest.replace(/,/g, ", ").replace(/-/g, "–")}`;
  return { book, usfm, ranges, display };
}

/** Strict USFM only (`LUK 6, 39–42`). Rejects liturgical `Lc 6, 39–42`. */
export function parseUsfmCitation(raw: string) {
  const token = String(raw ?? "")
    .trim()
    .split(/\s+/)[0];
  if (!token || !isUsfmId(token)) return null;
  return parseGospelCitation(raw);
}

export function verseInRanges(
  chapter: number,
  verse: number,
  ranges: VerseRange[],
) {
  return ranges.some(
    (range) =>
      range.chapter === chapter && verse >= range.start && verse <= range.end,
  );
}

function collapseNumbers(nums: number[]): string {
  if (!nums.length) return "";
  const parts: string[] = [];
  let start = nums[0]!;
  let prev = nums[0]!;
  for (let i = 1; i <= nums.length; i += 1) {
    const current = nums[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}–${prev}`);
    if (current !== undefined) {
      start = current;
      prev = current;
    }
  }
  return parts.join(".");
}

/** Mt 23, 27  ·  Mt 23, 27–32  ·  Lc 1, 5–7; 2, 1 */
export function formatVerseReference(
  book: CitaBook | null,
  verses: Pick<GospelVerse, "chapter" | "number">[],
  fallback: string,
): string {
  const numbered = verses.filter((verse) => verse.number > 0);
  if (!book || !numbered.length) return fallback;
  const groups: { chapter: number; nums: number[] }[] = [];
  for (const verse of numbered) {
    const last = groups[groups.length - 1];
    if (last && last.chapter === verse.chapter) last.nums.push(verse.number);
    else groups.push({ chapter: verse.chapter, nums: [verse.number] });
  }
  const abbr = citaBookToUsfm(book);
  if (groups.length === 1) {
    const group = groups[0]!;
    return `${abbr} ${group.chapter}, ${collapseNumbers(group.nums)}`;
  }
  return `${abbr} ${groups.map((group) => `${group.chapter}, ${collapseNumbers(group.nums)}`).join("; ")}`;
}
