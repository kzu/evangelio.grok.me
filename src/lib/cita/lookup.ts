import { BOOK_ABBREV, BOOK_NAMES, CITA_BOOKS, parseGospelCitation } from "@/lib/gospel/citation";
import type { CitaBook } from "@/lib/gospel/types";
import { NT_GOSPELS } from "@/lib/cita/nt-gospels";

export type IndexedVerse = {
  book: CitaBook;
  chapter: number;
  verse: number;
  text: string;
};

export function isCitaBook(value: string): value is CitaBook {
  return (CITA_BOOKS as string[]).includes(value);
}

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

export function getIndexedVerse(book: string, pin: string): IndexedVerse | null {
  if (!isCitaBook(book)) return null;
  const parsed = parseVersePin(pin);
  if (!parsed) return null;
  const text = NT_GOSPELS[book]?.[parsed.chapter - 1]?.[parsed.verse - 1];
  if (!text) return null;
  return { book, chapter: parsed.chapter, verse: parsed.verse, text };
}

export function getAdjacentVerse(current: IndexedVerse, direction: 1 | -1): IndexedVerse | null {
  let bookIndex = CITA_BOOKS.indexOf(current.book);
  let chapter = current.chapter;
  let verse = current.verse + direction;

  while (bookIndex >= 0 && bookIndex < CITA_BOOKS.length) {
    const book = CITA_BOOKS[bookIndex]!;
    const chapters = NT_GOSPELS[book] ?? [];
    while (chapter >= 1 && chapter <= chapters.length) {
      const verses = chapters[chapter - 1] ?? [];
      while (verse >= 1 && verse <= verses.length) {
        const text = verses[verse - 1];
        if (text) return { book, chapter, verse, text };
        verse += direction;
      }
      chapter += direction;
      const nextChapter = chapters[chapter - 1];
      verse = direction === 1 ? 1 : (nextChapter?.length ?? 0);
    }
    bookIndex += direction;
    if (bookIndex < 0 || bookIndex >= CITA_BOOKS.length) return null;
    const nextBook = CITA_BOOKS[bookIndex]!;
    const nextChapters = NT_GOSPELS[nextBook] ?? [];
    chapter = direction === 1 ? 1 : nextChapters.length;
    verse = direction === 1 ? 1 : (nextChapters[chapter - 1]?.length ?? 0);
  }
  return null;
}

export function versePath(verse: IndexedVerse): string {
  return `/citas/${verse.book}/${verse.chapter}.${verse.verse}`;
}

export function verseRef(verse: IndexedVerse): string {
  return `${BOOK_ABBREV[verse.book]} ${verse.chapter}, ${verse.verse}`;
}

export function verseImagePath(verse: IndexedVerse): string {
  return `/citas/${verse.book}/${verse.chapter}.${verse.verse}.png`;
}

export function verseBookName(verse: IndexedVerse): string {
  return BOOK_NAMES[verse.book];
}

export function verseWorkTitle(verse: IndexedVerse): string {
  return verse.book === "hch"
    ? "Hechos de los Apóstoles"
    : `Evangelio según ${BOOK_NAMES[verse.book]}`;
}

export function verseReadingLabel(verse: IndexedVerse): string {
  return verse.book === "hch"
    ? "Lectura de los Hechos de los Apóstoles"
    : `Lectura del santo Evangelio según ${BOOK_NAMES[verse.book]}`;
}

export function verseClosing(verse: IndexedVerse): string {
  return verse.book === "hch" ? "Palabra de Dios." : "Palabra del Señor.";
}

/** First verse of a citation, including ranges like "Lc 6, 27–38". */
export function firstIndexedVerse(reference: string): IndexedVerse | null {
  const parsed = parseGospelCitation(reference);
  const range = parsed?.ranges[0];
  if (!parsed || !range) return null;
  return getIndexedVerse(parsed.book, `${range.chapter}.${range.start}`);
}
