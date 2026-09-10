import type { CitaBook } from "@/lib/gospel/types";

export type CanonVerse = {
  book: CitaBook;
  chapter: number;
  verse: number;
  text: string;
  theme: "dark" | "light";
};

const BOOK_LABEL: Record<CitaBook, string> = {
  mt: "Mt",
  mc: "Mc",
  lc: "Lc",
  jn: "Jn",
  hch: "Hch",
};

/** First three verses of the first Gospel (Matthew 1), Libro del Pueblo de Dios. */
export const PREGENERATED_VERSES: CanonVerse[] = [
  {
    book: "mt",
    chapter: 1,
    verse: 1,
    text: "Genealogía de Jesucristo, hijo de David, hijo de Abraham:",
    theme: "light",
  },
  {
    book: "mt",
    chapter: 1,
    verse: 2,
    text: "Abraham fue padre de Isaac; Isaac, padre de Jacob; Jacob, padre de Judá y de sus hermanos.",
    theme: "light",
  },
  {
    book: "mt",
    chapter: 1,
    verse: 3,
    text: "Judá fue padre de Fares y de Zará, y la madre de estos fue Tamar. Fares fue padre de Aram;",
    theme: "light",
  },
];

export function canonBookLabel(book: string): string {
  return BOOK_LABEL[book as CitaBook] ?? book.toUpperCase();
}

export function canonReference(verse: CanonVerse): string {
  return `${canonBookLabel(verse.book)} ${verse.chapter}, ${verse.verse}`;
}

export function canonPath(verse: CanonVerse): string {
  return `/citas/${verse.book}/${verse.chapter}.${verse.verse}`;
}

export function canonImagePath(verse: CanonVerse): string {
  return `/citas/${verse.book}/${verse.chapter}.${verse.verse}.png`;
}

export function parseCanonPin(pin: string): { chapter: number; verse: number } | null {
  const match = String(pin ?? "").trim().match(/^(\d+)\.(\d+)$/);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return { chapter, verse };
}

export function findCanonVerse(book: string, pin: string): CanonVerse | null {
  const parsed = parseCanonPin(pin);
  if (!parsed) return null;
  return (
    PREGENERATED_VERSES.find(
      (item) => item.book === book && item.chapter === parsed.chapter && item.verse === parsed.verse,
    ) ?? null
  );
}
