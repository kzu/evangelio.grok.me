import type { DailyGospel, GospelEdition } from "./types";

export function emptyGospel(
  date: string | undefined,
  edition: GospelEdition,
  error: unknown,
): DailyGospel {
  const iso =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
        }).format(new Date());
  const message =
    error instanceof Error ? error.message : "No se pudo cargar el Evangelio";
  const prev = shiftIso(iso, -1);
  const next = shiftIso(iso, 1);
  return {
    date: iso,
    displayDate: iso,
    liturgicalDay: "",
    liturgicalColor: "unknown",
    prevDate: prev,
    nextDate: next,
    citation: "",
    book: null,
    bookName: "el Evangelio",
    verses: [],
    gospelHtmlFallback: "",
    source: edition === "family" ? "family" : "evangeli",
    edition,
    vaticanUrl: null,
    commentTitle: "",
    authorName: "",
    authorOrigin: "",
    commentary: [],
    thoughts: [],
    evangeliUrl:
      edition === "family"
        ? `https://family.evangeli.net/es/dia/${iso}`
        : `https://evangeli.net/evangelio/dia/${iso}`,
    adaptedLatino: false,
    loadError: message,
  };
}

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
