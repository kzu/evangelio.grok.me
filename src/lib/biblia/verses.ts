import type { GospelVerse, VerseRange } from "@/lib/gospel/types";

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
