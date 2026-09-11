import { createServerFn } from "@tanstack/react-start";
import type { GospelVerse } from "@/lib/gospel/types";
import { formatUsfmSlug, parseUsfmSlug, type UsfmRef } from "@/lib/quote-ref";
import { adjacentVerseInBook, versesFromBook } from "./verses";

export type BibliaFragment = {
  ref: UsfmRef;
  verses: GospelVerse[];
  prev: { slug: string } | null;
  next: { slug: string } | null;
};

export const getBibliaFragment = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({
    slug: String(input?.slug ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<BibliaFragment | null> => {
    const parsed = parseUsfmSlug(data.slug);
    if (!parsed) return null;
    const { loadBibliaBook } = await import("./load.server");
    const book = await loadBibliaBook(parsed.usfm);
    if (!book) return null;
    const verses = versesFromBook(book, parsed.ranges);
    if (!verses.length) return null;
    const first = verses[0]!;
    const last = verses[verses.length - 1]!;
    const prevHit = adjacentVerseInBook(book, first.chapter, first.number, -1);
    const nextHit = adjacentVerseInBook(book, last.chapter, last.number, 1);
    return {
      ref: parsed,
      verses,
      prev: prevHit
        ? {
            slug: formatUsfmSlug(parsed.usfm, [
              { chapter: prevHit.chapter, start: prevHit.verse, end: prevHit.verse },
            ]),
          }
        : null,
      next: nextHit
        ? {
            slug: formatUsfmSlug(parsed.usfm, [
              { chapter: nextHit.chapter, start: nextHit.verse, end: nextHit.verse },
            ]),
          }
        : null,
    };
  });

/** Call from route loaders so createServerFn stubs stay out of the router chunk. */
export function fetchBibliaFragment(slug: string) {
  return getBibliaFragment({ data: { slug } });
}
