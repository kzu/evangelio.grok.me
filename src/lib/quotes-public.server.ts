import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { quoteSlug } from "@/lib/quote-ref";
import type { GospelEdition } from "@/lib/gospel/types";
import { resolvePublicHost } from "../../scripts/grok-pwa-shared.mjs";

export type PublicQuote = {
  reference: string;
  body: string;
  book: string;
  date: string;
  edition: GospelEdition;
};

function parseEdition(value: unknown): GospelEdition {
  return value === "family" ? "family" : "adult";
}

export function requestOrigin(): string {
  const envHost = resolvePublicHost(process.env.VITE_PUBLIC_HOSTNAME ?? "");
  try {
    const request = getRequest();
    const headerHost = request
      ? (request.headers.get("x-forwarded-host") ??
          request.headers.get("host") ??
          new URL(request.url).host)
      : "";
    const host = resolvePublicHost(headerHost) || envHost || "evangelio.grok.me";
    return `https://${host}`;
  } catch {
    return `https://${envHost || "evangelio.grok.me"}`;
  }
}

export async function findQuoteBySlug(rawSlug: string): Promise<PublicQuote | null> {
  const slug = quoteSlug(rawSlug);
  if (!slug) return null;
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    reference: string;
    body: string;
    book: string;
    gospel_date: string;
    edition: string;
  }>`
    select id, reference, body, book, gospel_date, edition
    from quotes
    where slug = ${slug}
    order by created_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const { firstIndexedVerse } = await import("@/lib/cita/lookup");
  if (!firstIndexedVerse(row.reference)) {
    await sql`delete from quotes where id = ${Number(row.id)}`;
    return null;
  }
  return {
    reference: row.reference,
    body: row.body,
    book: row.book,
    date: row.gospel_date,
    edition: parseEdition(row.edition),
  };
}
