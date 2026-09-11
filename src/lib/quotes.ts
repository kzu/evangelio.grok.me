import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { GospelEdition } from "@/lib/gospel/types";
import { parseUsfmSlug, quoteSlug, toUsfmSlug } from "@/lib/quote-ref";

export type QuoteMode = "verse" | "selection";

export type QuoteItem = {
  id: number;
  date: string;
  edition: GospelEdition;
  book: string;
  reference: string;
  mode: QuoteMode;
  body: string;
  verseStart: number;
  verseEnd: number;
  chapterStart: number;
  chapterEnd: number;
  createdAt: string;
};

export type QuoteInput = {
  date: string;
  edition?: GospelEdition;
  book?: string;
  reference: string;
  mode: QuoteMode;
  body: string;
  verseStart?: number;
  verseEnd?: number;
  chapterStart?: number;
  chapterEnd?: number;
};

function parseEdition(value: unknown): GospelEdition {
  return value === "family" ? "family" : "adult";
}

function parseDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Fecha inválida");
  }
  return value;
}

function clip(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function parseMode(value: unknown): QuoteMode {
  return value === "selection" ? "selection" : "verse";
}

function parseIntSafe(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<QuoteItem[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      gospel_date: string;
      edition: string;
      book: string;
      reference: string;
      mode: string;
      body: string;
      verse_start: number;
      verse_end: number;
      chapter_start: number;
      chapter_end: number;
      created_at: string;
    }>`
      select id, gospel_date, edition, book, reference, mode, body,
             verse_start, verse_end, chapter_start, chapter_end,
             created_at::text as created_at
      from quotes
      where user_id = ${context.userId}
      order by created_at desc
    `;
    const { loadBibliaBook } = await import("@/lib/biblia/load.server");
    const { versesFromBook } = await import("@/lib/biblia/verses");
    const items: QuoteItem[] = [];
    const stale: number[] = [];
    for (const row of rows) {
      const id = Number(row.id);
      const parsed = parseUsfmSlug(row.reference);
      const json = parsed ? await loadBibliaBook(parsed.usfm) : null;
      if (!parsed || !json || !versesFromBook(json, parsed.ranges).length) {
        stale.push(id);
        continue;
      }
      items.push({
        id,
        date: row.gospel_date,
        edition: parseEdition(row.edition),
        book: row.book,
        reference: row.reference,
        mode: parseMode(row.mode),
        body: row.body,
        verseStart: Number(row.verse_start) || 0,
        verseEnd: Number(row.verse_end) || 0,
        chapterStart: Number(row.chapter_start) || 0,
        chapterEnd: Number(row.chapter_end) || 0,
        createdAt: row.created_at,
      });
    }
    for (const id of stale) {
      await sql`
        delete from quotes
        where user_id = ${context.userId} and id = ${id}
      `;
    }
    return items;
  });

export const addQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: QuoteInput) => ({
    date: parseDate(input.date),
    edition: parseEdition(input.edition),
    book: clip(input.book, 8),
    reference: clip(input.reference, 160),
    mode: parseMode(input.mode),
    body: clip(input.body, 8000),
    verseStart: parseIntSafe(input.verseStart),
    verseEnd: parseIntSafe(input.verseEnd),
    chapterStart: parseIntSafe(input.chapterStart),
    chapterEnd: parseIntSafe(input.chapterEnd),
  }))
  .handler(async ({ context, data }): Promise<{ created: boolean }> => {
    if (!data.body || !data.reference) return { created: false };
    const reference = toUsfmSlug(data.reference);
    if (!reference) return { created: false };
    const parsed = parseUsfmSlug(reference);
    const { loadBibliaBook } = await import("@/lib/biblia/load.server");
    const { versesFromBook } = await import("@/lib/biblia/verses");
    const json = parsed ? await loadBibliaBook(parsed.usfm) : null;
    if (!parsed || !json || !versesFromBook(json, parsed.ranges).length) return { created: false };
    const book = parsed.usfm;
    const slug = quoteSlug(reference);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ id: number }>`
      select id from quotes
      where user_id = ${context.userId} and reference = ${reference}
      limit 1
    `;
    if (existing.length) return { created: false };

    const columns = {
      userId: context.userId,
      date: data.date,
      edition: data.edition,
      book,
      reference,
      mode: data.mode,
      body: data.body,
      verseStart: data.verseStart,
      verseEnd: data.verseEnd,
      chapterStart: data.chapterStart,
      chapterEnd: data.chapterEnd,
    };

    try {
      await sql`
        insert into quotes (
          user_id, gospel_date, edition, book, reference, mode, body,
          verse_start, verse_end, chapter_start, chapter_end, slug
        )
        values (
          ${columns.userId}, ${columns.date}, ${columns.edition}, ${columns.book},
          ${columns.reference}, ${columns.mode}, ${columns.body},
          ${columns.verseStart}, ${columns.verseEnd}, ${columns.chapterStart},
          ${columns.chapterEnd}, ${slug}
        )
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate|unique/i.test(message)) return { created: false };
      if (!/slug/i.test(message)) throw error;
      await sql`
        insert into quotes (
          user_id, gospel_date, edition, book, reference, mode, body,
          verse_start, verse_end, chapter_start, chapter_end
        )
        values (
          ${columns.userId}, ${columns.date}, ${columns.edition}, ${columns.book},
          ${columns.reference}, ${columns.mode}, ${columns.body},
          ${columns.verseStart}, ${columns.verseEnd}, ${columns.chapterStart},
          ${columns.chapterEnd}
        )
      `;
    }
    return { created: true };
  });

export const removeQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => {
    const id = Number(input.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Cita inválida");
    return { id };
  })
  .handler(async ({ context, data }): Promise<void> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      delete from quotes
      where id = ${data.id} and user_id = ${context.userId}
    `;
  });

export const getPublicQuote = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({
    slug: quoteSlug(clip(input.slug, 80)),
  }))
  .handler(async ({ data }) => {
    const { findQuoteBySlug, requestOrigin } = await import("./quotes-public.server");
    const quote = await findQuoteBySlug(data.slug);
    return { quote, origin: requestOrigin(), slug: data.slug };
  });
