import type { GospelVerse, VerseRange } from "../gospel/types.ts";

/** `book[chapter - 1][verse - 1]` → liturgical verse objects in range order. */
export function versesFromBook(book: string[][], ranges: VerseRange[]): GospelVerse[] {
  const out: GospelVerse[] = [];
  for (const range of ranges) {
    const chapter = book[range.chapter - 1];
    if (!chapter?.length) continue;
    const last = Math.min(range.end, chapter.length);
    for (let number = range.start; number <= last; number += 1) {
      const text = chapter[number - 1];
      if (!text) continue;
      out.push({ chapter: range.chapter, number, text });
    }
  }
  return out;
}

export function adjacentVerseInBook(
  book: string[][],
  chapter: number,
  verse: number,
  direction: 1 | -1,
): { chapter: number; verse: number; text: string } | null {
  let ch = chapter;
  let v = verse + direction;
  while (ch >= 1 && ch <= book.length) {
    const verses = book[ch - 1] ?? [];
    while (v >= 1 && v <= verses.length) {
      const text = verses[v - 1];
      if (text) return { chapter: ch, verse: v, text };
      v += direction;
    }
    ch += direction;
    const next = book[ch - 1];
    v = direction === 1 ? 1 : (next?.length ?? 0);
  }
  return null;
}
