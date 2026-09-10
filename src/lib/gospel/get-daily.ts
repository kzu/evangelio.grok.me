import { createServerFn } from "@tanstack/react-start";
import { emptyGospel } from "./empty";
import type { DailyGospel, GospelEdition, LatinoCopy } from "./types";

function parseEdition(value: unknown): GospelEdition {
  return value === "family" ? "family" : "adult";
}

export const getDailyGospel = createServerFn({ method: "GET" })
  .validator((input: { date?: string; edition?: GospelEdition } | undefined) => {
    const date = input?.date;
    const edition = parseEdition(input?.edition);
    if (!date) return { date: undefined as string | undefined, edition };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Fecha inválida");
    }
    return { date, edition };
  })
  .handler(async ({ data }): Promise<DailyGospel> => {
    try {
      const { loadDailyGospel } = await import("./scrape.server");
      return await loadDailyGospel(data.date, data.edition);
    } catch (error) {
      console.error("[gospel] getDailyGospel failed", error);
      return emptyGospel(data.date, data.edition, error);
    }
  });

export const adaptDailyGospel = createServerFn({ method: "POST" })
  .validator((input: { date: string; edition?: GospelEdition }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new Error("Fecha inválida");
    }
    return { date: input.date, edition: parseEdition(input.edition) };
  })
  .handler(async ({ data }): Promise<LatinoCopy | null> => {
    try {
      const { localizeCachedGospel } = await import("./scrape.server");
      return await localizeCachedGospel(data.date, data.edition);
    } catch (error) {
      console.error("[gospel] adaptDailyGospel failed", error);
      return null;
    }
  });

/** Call from route loaders so createServerFn stubs stay out of the router chunk. */
export function fetchDailyGospel(date: string | undefined, edition: GospelEdition) {
  return getDailyGospel({ data: { date, edition } });
}
