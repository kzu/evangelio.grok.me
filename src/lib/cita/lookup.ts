import { citaBookToUsfm, displayUsfmBook, isUsfmId, usfmToCitaBook } from "@/lib/biblia/usfm";
import { NT_GOSPELS } from "@/lib/cita/nt-gospels";
import { BOOK_NAMES, CITA_BOOKS } from "@/lib/gospel/citation";
import type { CitaBook } from "@/lib/gospel/types";
import { firstVerseSlug, parseUsfmSlug } from "@/lib/quote-ref";

export type IndexedVerse = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

const USFM_ORDER = CITA_BOOKS.map((book) => citaBookToUsfm(book));

export function parseVersePin(pin: string): { chapter: number; verse: number } | null {
  const match = String(pin ?? "")
    .replace(/\.png$/i, "")
    .trim()
    .match(/^(\d+)\.(\d+)$/);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return { chapter, verse };
}

function citaForUsfm(book: string): CitaBook | null {
  if (!isUsfmId(book)) return null;
  return usfmToCitaBook(book.trim().toUpperCase());
}

export function getIndexedVerse(book: string, pin: string): IndexedVerse | null {
  const cita = citaForUsfm(book);
  const parsed = parseVersePin(pin);
  if (!cita || !parsed) return null;
  const usfm = citaBookToUsfm(cita);
  const text = NT_GOSPELS[cita]?.[parsed.chapter - 1]?.[parsed.verse - 1];
  if (!text) return null;
  return { book: usfm, chapter: parsed.chapter, verse: parsed.verse, text };
}

export function getAdjacentVerse(current: IndexedVerse, direction: 1 | -1): IndexedVerse | null {
  let bookIndex = USFM_ORDER.indexOf(current.book);
  let chapter = current.chapter;
  let verse = current.verse + direction;

  while (bookIndex >= 0 && bookIndex < USFM_ORDER.length) {
    const usfm = USFM_ORDER[bookIndex]!;
    const cita = usfmToCitaBook(usfm);
    if (!cita) return null;
    const chapters = NT_GOSPELS[cita] ?? [];
    while (chapter >= 1 && chapter <= chapters.length) {
      const verses = chapters[chapter - 1] ?? [];
      while (verse >= 1 && verse <= verses.length) {
        const text = verses[verse - 1];
        if (text) return { book: usfm, chapter, verse, text };
        verse += direction;
      }
      chapter += direction;
      const nextChapter = chapters[chapter - 1];
      verse = direction === 1 ? 1 : (nextChapter?.length ?? 0);
    }
    bookIndex += direction;
    if (bookIndex < 0 || bookIndex >= USFM_ORDER.length) return null;
    const nextUsfm = USFM_ORDER[bookIndex]!;
    const nextCita = usfmToCitaBook(nextUsfm);
    const nextChapters = nextCita ? (NT_GOSPELS[nextCita] ?? []) : [];
    chapter = direction === 1 ? 1 : nextChapters.length;
    verse = direction === 1 ? 1 : (nextChapters[chapter - 1]?.length ?? 0);
  }
  return null;
}

export function versePath(verse: IndexedVerse): string {
  return `/biblia/${verse.book}.${verse.chapter}.${verse.verse}`;
}

export function verseRef(verse: IndexedVerse): string {
  return `${displayUsfmBook(verse.book)} ${verse.chapter}, ${verse.verse}`;
}

export function verseImagePath(verse: IndexedVerse): string {
  return `/citas/${verse.book}.${verse.chapter}.${verse.verse}.png`;
}

export function verseBookName(verse: IndexedVerse): string {
  const cita = usfmToCitaBook(verse.book);
  return cita ? BOOK_NAMES[cita] : verse.book;
}

export function verseWorkTitle(verse: IndexedVerse): string {
  return verse.book === "ACT"
    ? "Hechos de los Apóstoles"
    : `Evangelio según ${verseBookName(verse)}`;
}

export function verseReadingLabel(verse: IndexedVerse): string {
  return verse.book === "ACT"
    ? "Lectura de los Hechos de los Apóstoles"
    : `Lectura del santo Evangelio según ${verseBookName(verse)}`;
}

export function verseClosing(verse: IndexedVerse): string {
  return verse.book === "ACT" ? "Palabra de Dios." : "Palabra del Señor.";
}

/** First verse of a canonical slug (`LUK.6.39-42`). */
export function firstIndexedVerse(reference: string): IndexedVerse | null {
  const parsed = parseUsfmSlug(reference);
  const range = parsed?.ranges[0];
  if (!parsed || !range) return null;
  return getIndexedVerse(parsed.usfm, `${range.chapter}.${range.start}`);
}

export function fragmentThumbPath(reference: string): string {
  const parsed = parseUsfmSlug(reference);
  if (!parsed) return "";
  return `/citas/${firstVerseSlug(parsed)}.png`;
}
