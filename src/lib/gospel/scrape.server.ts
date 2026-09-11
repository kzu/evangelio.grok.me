import { load, type CheerioAPI } from "cheerio";
import { citaBookToUsfm } from "@/lib/biblia/usfm";
import { loadBibliaBook } from "@/lib/biblia/load.server";
import { versesFromBook } from "@/lib/biblia/verses";
import { BOOK_NAMES, isGospelBook, parseGospelCitation } from "./citation";
import { emptyGospel } from "./empty";
import type {
  DailyGospel,
  GospelEdition,
  GospelVerse,
  LatinoCopy,
  LiturgicalColor,
  Thought,
} from "./types";
import { vaticanChapterUrl } from "./vatican-map";
import { collapseWhitespace } from "../utils";
import { adaptToLatinoSpanish, getCachedLatino } from "./localize.server";

const EVANGELI_TODAY = "https://evangeli.net/evangelio";
const FAMILY_TODAY = "https://family.evangeli.net/es";
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

const cache = new Map<string, { at: number; data: DailyGospel }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKey(date: string | undefined, edition: GospelEdition) {
  return `${edition}:${date ?? "today"}`;
}

export async function loadDailyGospel(
  date?: string,
  edition: GospelEdition = "adult",
): Promise<DailyGospel> {
  const key = cacheKey(date, edition);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const data = await (async () => {
    try {
      return edition === "family" ? await loadFamilyGospel(date) : await loadAdultGospel(date);
    } catch (err) {
      console.error("[gospel] load failed", { date, edition, err });
      return emptyGospel(date, edition, err);
    }
  })();

  if (!data.loadError) {
    cache.set(key, { at: Date.now(), data });
    cache.set(cacheKey(data.date, edition), { at: Date.now(), data });
  }
  return data;
}

export async function localizeCachedGospel(
  date: string,
  edition: GospelEdition = "adult",
): Promise<LatinoCopy | null> {
  const gospel = await loadDailyGospel(date, edition);
  const latino = await adaptToLatinoSpanish(
    date,
    {
      commentTitle: gospel.commentTitle,
      commentary: gospel.commentary,
      thoughts: gospel.thoughts,
      gospelText:
        edition === "family" ? gospel.verses.map((v) => v.text).join(" ").trim() : "",
    },
    edition,
  );
  if (!latino) return null;
  applyLatinoToCache(date, edition, latino);
  return latino;
}

function applyLatinoToCache(date: string, edition: GospelEdition, latino: LatinoCopy) {
  for (const [key, entry] of cache.entries()) {
    if (!key.startsWith(`${edition}:`)) continue;
    if (entry.data.date !== date) continue;
    entry.data = {
      ...entry.data,
      commentTitle: latino.commentTitle || entry.data.commentTitle,
      commentary: latino.commentary.length ? latino.commentary : entry.data.commentary,
      thoughts: latino.thoughts.length ? latino.thoughts : entry.data.thoughts,
      adaptedLatino: true,
      verses:
        edition === "family" && latino.gospelText
          ? [
              {
                chapter: entry.data.verses[0]?.chapter ?? 0,
                number: 0,
                text: latino.gospelText,
              },
            ]
          : entry.data.verses,
    };
  }
}

async function loadAdultGospel(date?: string): Promise<DailyGospel> {
  const evangeliUrl = date ? `https://evangeli.net/evangelio/dia/${date}` : EVANGELI_TODAY;

  const html = await fetchText(evangeliUrl);
  const $ = load(html);

  const isoDate =
    $("#calendar_selector").attr("data-current-date") || date || todayISO();

  const displayDate = collapseWhitespace($(".current_day").text()) || isoDate;
  const liturgicalDay = collapseWhitespace($(".dia_liturgic").first().text());
  const liturgicalColor = parseLiturgicalColor(
    $(".dia_liturgic").first().attr("class") ?? "",
  );

  const prevDate = hrefDate($(".previous_day a").attr("href"));
  const nextDate = hrefDate($(".next_day a").attr("href"));

  const citationRaw = collapseWhitespace($(".evangeli_text strong").first().text());
  const parsed = parseGospelCitation(citationRaw);
  const gospelHtmlFallback = collapseWhitespace($("#gospel_norm").text());

  const commentTitle = collapseWhitespace($("p.titol").first().text());
  const authorName = collapseWhitespace($(".autor_name").first().text());
  const authorOrigin = collapseWhitespace($(".autor_origin").first().text());
  const commentary = splitCommentary($(".comentari_evangeli").first().html() ?? "");
  const thoughts = parseThoughts($);

  let verses: GospelVerse[] = [];
  let source: DailyGospel["source"] = "evangeli";
  let vaticanUrl: string | null = null;

  if (parsed) {
    const usfm = citaBookToUsfm(parsed.book);
    const bookJson = loadBibliaBook(usfm);
    if (bookJson) {
      verses = versesFromBook(bookJson, parsed.ranges);
      if (verses.length) {
        source = "vatican";
        vaticanUrl = vaticanChapterUrl(parsed.book, parsed.ranges[0]?.chapter ?? 1);
      }
    }
  }

  if (!verses.length && gospelHtmlFallback) {
    verses = [
      {
        chapter: parsed?.ranges[0]?.chapter ?? 0,
        number: 0,
        text: gospelHtmlFallback,
      },
    ];
  }

  const citationDisplay =
    parsed?.display ??
    citationRaw
      .replace(/^Texto del Evangelio\s*/i, "")
      .replace(/^\(|\):?$/g, "")
      .trim();

  const latino = getCachedLatino(isoDate, "adult");

  return {
    date: isoDate,
    displayDate,
    liturgicalDay,
    liturgicalColor,
    prevDate,
    nextDate,
    citation: citationDisplay,
    book: parsed && isGospelBook(parsed.book) ? parsed.book : null,
    bookName: parsed ? BOOK_NAMES[parsed.book] : "el Evangelio",
    verses: verses,
    gospelHtmlFallback,
    source,
    edition: "adult",
    vaticanUrl,
    commentTitle: latino?.commentTitle || commentTitle,
    authorName,
    authorOrigin,
    commentary: latino?.commentary?.length ? latino.commentary : commentary,
    thoughts: latino?.thoughts?.length ? latino.thoughts : thoughts,
    evangeliUrl,
    adaptedLatino: Boolean(latino),
  };
}

type FamilyPageProps = {
  date?: string;
  gospelDetail?: {
    title?: string;
    evangelist_id?: string;
    versicles?: string;
    gospel?: string;
    gospelLong?: string;
  };
  gospelCommentDetail?: { comment?: string[] };
  gospelImageDetail?: { title?: string };
  calendarFirstAvailableDate?: string;
  calendarLastAvailableDate?: string;
};

async function loadFamilyGospel(date?: string): Promise<DailyGospel> {
  const isoRequested = date || todayISO();
  const familyUrl = date
    ? `https://family.evangeli.net/es/dia/${date}`
    : FAMILY_TODAY;

  const html = await fetchText(familyUrl);
  const $ = load(html);
  const raw = $("script#__NEXT_DATA__").text();
  if (!raw) throw new Error("No se pudo leer el Evangelio familiar");

  let pageProps: FamilyPageProps = {};
  try {
    const parsed = JSON.parse(raw) as { props?: { pageProps?: FamilyPageProps } };
    pageProps = parsed.props?.pageProps ?? {};
  } catch {
    throw new Error("No se pudo leer el Evangelio familiar");
  }

  const detail = pageProps.gospelDetail ?? {};
  const isoDate = toISODate(pageProps.date) || isoRequested;
  const gospelText = collapseWhitespace(detail.gospel || detail.gospelLong || "");
  if (!gospelText) throw new Error("El Evangelio familiar no tiene texto hoy");

  const citationRaw = [detail.evangelist_id, detail.versicles].filter(Boolean).join(" ");
  const parsed = parseGospelCitation(citationRaw);
  const commentTitle = collapseWhitespace(pageProps.gospelImageDetail?.title ?? "");
  const commentary = (pageProps.gospelCommentDetail?.comment ?? []).flatMap((chunk) =>
    chunk
      .split(/\r?\n\s*\r?\n/)
      .map((part) => collapseWhitespace(part))
      .filter(Boolean),
  );

  const first = toISODate(pageProps.calendarFirstAvailableDate);
  const last = toISODate(pageProps.calendarLastAvailableDate);
  const prev = shiftDate(isoDate, -1);
  const next = shiftDate(isoDate, 1);

  const latino = getCachedLatino(isoDate, "family");
  const adaptedText = latino?.gospelText || gospelText;
  const adult = cache.get(cacheKey(isoDate, "adult"))?.data;

  return {
    date: isoDate,
    displayDate: isoDate,
    liturgicalDay: collapseWhitespace(detail.title ?? "") || "Evangelio familiar",
    liturgicalColor: adult?.date === isoDate ? adult.liturgicalColor : "unknown",
    prevDate: !first || prev >= first ? prev : null,
    nextDate: !last || next <= last ? next : null,
    citation: parsed?.display ?? citationRaw,
    book: parsed && isGospelBook(parsed.book) ? parsed.book : null,
    bookName: parsed ? BOOK_NAMES[parsed.book] : "el Evangelio",
    verses: [
      {
        chapter: parsed?.ranges[0]?.chapter ?? 0,
        number: 0,
        text: adaptedText,
      },
    ],
    gospelHtmlFallback: gospelText,
    source: "family",
    edition: "family",
    vaticanUrl: null,
    commentTitle: latino?.commentTitle || commentTitle,
    authorName: "",
    authorOrigin: "",
    commentary: latino?.commentary?.length ? latino.commentary : commentary,
    thoughts: latino?.thoughts?.length ? latino.thoughts : [],
    evangeliUrl: `https://family.evangeli.net/es/dia/${isoDate}`,
    adaptedLatino: Boolean(latino),
  };
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`No se pudo leer la fuente (${res.status})`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseLiturgicalColor(className: string): LiturgicalColor {
  const map: Record<string, LiturgicalColor> = {
    dia_green: "green",
    dia_white: "white",
    dia_red: "red",
    dia_violet: "violet",
    dia_purple: "violet",
    dia_rose: "rose",
    dia_pink: "rose",
    dia_black: "black",
  };
  for (const [cls, color] of Object.entries(map)) {
    if (className.includes(cls)) return color;
  }
  return "unknown";
}

function hrefDate(href?: string) {
  if (!href) return null;
  const match = href.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function toISODate(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function splitCommentary(html: string) {
  return html
    .split(/<br\s*\/?>/i)
    .map((chunk) => collapseWhitespace(load(`<div>${chunk}</div>`)("div").text()))
    .filter((p) => p.length > 0);
}

function parseThoughts($: CheerioAPI): Thought[] {
  const thoughts: Thought[] = [];
  $(".thoughts_text li").each((_, el) => {
    const raw = collapseWhitespace($(el).text());
    if (!raw) return;
    const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      thoughts.push({
        quote: stripOuterQuotes(match[1]),
        source: match[2].trim(),
      });
    } else {
      thoughts.push({ quote: stripOuterQuotes(raw), source: "" });
    }
  });
  return thoughts;
}

function stripOuterQuotes(value: string) {
  return value.replace(/^[«""]+|[»""]+$/g, "").trim();
}
