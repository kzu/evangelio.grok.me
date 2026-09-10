import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { GospelEdition } from "@/lib/gospel/types";

export type FavoriteItem = {
  date: string;
  edition: GospelEdition;
  citation: string;
  liturgicalDay: string;
  createdAt: string;
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

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FavoriteItem[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      gospel_date: string;
      edition: string;
      citation: string;
      liturgical_day: string;
      created_at: string;
    }>`
      select gospel_date, edition, citation, liturgical_day, created_at::text as created_at
      from favorites
      where user_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map((row) => ({
      date: row.gospel_date,
      edition: parseEdition(row.edition),
      citation: row.citation,
      liturgicalDay: row.liturgical_day,
      createdAt: row.created_at,
    }));
  });

export const isFavorite = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { date: string; edition?: GospelEdition }) => ({
    date: parseDate(input.date),
    edition: parseEdition(input.edition),
  }))
  .handler(async ({ context, data }): Promise<boolean> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ ok: number }>`
      select 1 as ok
      from favorites
      where user_id = ${context.userId}
        and gospel_date = ${data.date}
        and edition = ${data.edition}
      limit 1
    `;
    return rows.length > 0;
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { date: string; edition?: GospelEdition; citation?: string; liturgicalDay?: string }) => ({
    date: parseDate(input.date),
    edition: parseEdition(input.edition),
    citation: clip(input.citation, 160),
    liturgicalDay: clip(input.liturgicalDay, 200),
  }))
  .handler(async ({ context, data }): Promise<void> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into favorites (user_id, gospel_date, edition, citation, liturgical_day)
      values (${context.userId}, ${data.date}, ${data.edition}, ${data.citation}, ${data.liturgicalDay})
      on conflict (user_id, gospel_date, edition) do nothing
    `;
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { date: string; edition?: GospelEdition }) => ({
    date: parseDate(input.date),
    edition: parseEdition(input.edition),
  }))
  .handler(async ({ context, data }): Promise<void> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      delete from favorites
      where user_id = ${context.userId}
        and gospel_date = ${data.date}
        and edition = ${data.edition}
    `;
  });
