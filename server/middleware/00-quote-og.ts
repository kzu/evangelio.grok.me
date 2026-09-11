import { resolvePublicHost } from "../../scripts/grok-pwa-shared.mjs";
import { getIndexedVerse, verseRef } from "../../src/lib/cita/lookup";
import {
  displayUsfmRef,
  firstVerseSlug,
  mapCitaThumbPath,
  parseUsfmSlug,
} from "../../src/lib/quote-ref";

const PNG_PATH = /^\/(?:citas|biblia)\/([A-Za-z][A-Za-z0-9]*)\.(\d+)\.(\d+)\.png$/i;
const FRAGMENT_PATH = /^\/biblia\/([^/]+)\/?$/;
const CRAWLER =
  /bot|crawler|spider|facebookexternalhit|facebot|whatsapp|twitterbot|telegram|slackbot|linkedinbot|discordbot|pinterest|skypeuripreview|applebot|iframely|embedly|preview|vkshare|redditbot|qwantify|nuzzel|bitlybot|x\.com/i;

interface QuoteOgEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function requestOrigin(event: QuoteOgEvent): string {
  const headerHost =
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host;
  const host = resolvePublicHost(headerHost) || "evangelio.grok.me";
  return `https://${host}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/"/g, "\u0026quot;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;");
}

function isCrawler(event: QuoteOgEvent): boolean {
  const ua = event.req.headers.get("user-agent") ?? "";
  if (CRAWLER.test(ua)) return true;
  const purpose =
    event.req.headers.get("purpose") ?? event.req.headers.get("x-purpose") ?? "";
  return /preview/i.test(purpose);
}

function quoteMeta(input: {
  title: string;
  description: string;
  url: string;
  image: string;
}): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const url = escapeHtml(input.url);
  const image = escapeHtml(input.image);
  return [
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Evangelio de Hoy">`,
    `<meta property="og:locale" content="es_LA">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:secure_url" content="${image}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join("");
}

function crawlerDocument(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  body: string;
  reference: string;
}): string {
  const tags = quoteMeta(input);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">${tags}<title>${escapeHtml(input.title)}</title><meta name="description" content="${escapeHtml(input.description)}"></head><body><p>${escapeHtml(input.body)}</p><p>${escapeHtml(input.reference)}</p></body></html>`;
}

const SHARE_META =
  /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:title|og:description|og:image|og:image:secure_url|og:image:width|og:image:height|og:image:type|og:url|og:type|og:site_name|og:locale|twitter:card|twitter:title|twitter:description|twitter:image)["'][^>]*>/gi;

function patchDocument(
  html: string,
  input: { title: string; description: string; url: string; image: string },
): string {
  const tags = quoteMeta(input);
  const stripped = html.replace(SHARE_META, "");
  if (/<head\b[^>]*>/i.test(stripped)) {
    return stripped.replace(/<head\b[^>]*>/i, (open) => `${open}${tags}`);
  }
  return crawlerDocument({ ...input, body: input.description, reference: input.title });
}

function fragmentCard(slug: string, origin: string) {
  const parsed = parseUsfmSlug(slug);
  const range = parsed?.ranges[0];
  if (!parsed || !range) return null;
  const verse = getIndexedVerse(parsed.usfm, `${range.chapter}.${range.start}`);
  if (!verse) return null;
  const title = `${displayUsfmRef(parsed)} · Evangelio de Hoy`;
  const description = `«${verse.text}»`;
  return {
    title,
    description,
    url: `${origin}/biblia/${parsed.slug}`,
    image: `${origin}/citas/${firstVerseSlug(parsed)}.png`,
    body: verse.text,
    reference: displayUsfmRef(parsed),
  };
}

export default async function quoteOgMiddleware(
  event: QuoteOgEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const pathname = event.url.pathname;
  const mappedThumb = mapCitaThumbPath(pathname);
  if (mappedThumb) {
    if (mappedThumb !== pathname) event.url.pathname = mappedThumb;
    const served = await next();
    if (
      served instanceof Response &&
      served.ok &&
      String(served.headers.get("content-type") ?? "").includes("image/png")
    ) {
      return served;
    }
    const pngMatch = PNG_PATH.exec(pathname);
    const parsed = pngMatch
      ? parseUsfmSlug(`${pngMatch[1]}.${pngMatch[2]}.${pngMatch[3]}`)
      : null;
    const range = parsed?.ranges[0];
    const verse =
      parsed && range ? getIndexedVerse(parsed.usfm, `${range.chapter}.${range.start}`) : null;
    if (!verse) {
      return served instanceof Response
        ? served
        : new Response("Not found", {
            status: 404,
            headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
          });
    }
    const { quoteOgPng } = await import("../../src/lib/quote-og-png");
    const png = quoteOgPng({
      reference: verseRef(verse),
      body: verse.text,
      theme: "light",
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const origin = requestOrigin(event);
  const fragmentMatch = FRAGMENT_PATH.exec(pathname);
  const card = fragmentMatch ? fragmentCard(fragmentMatch[1] ?? "", origin) : null;
  if (!card) return next();

  if (isCrawler(event)) {
    try {
      return new Response(crawlerDocument(card), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    } catch (err) {
      console.error("[quote-og] crawler document failed:", err);
    }
  }

  const result = await next();
  if (
    !(result instanceof Response) ||
    !result.body ||
    !String(result.headers.get("content-type") ?? "").includes("text/html")
  ) {
    return result;
  }

  try {
    const html = await result.text();
    const patched = patchDocument(html, card);
    const headers = new Headers(result.headers);
    headers.delete("content-length");
    return new Response(patched, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  } catch (err) {
    console.error("[quote-og] patch failed:", err);
    return result;
  }
}
