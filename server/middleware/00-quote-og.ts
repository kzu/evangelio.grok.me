import { resolvePublicHost } from "../../scripts/grok-pwa-shared.mjs";
import {
  firstIndexedVerse,
  getIndexedVerse,
  verseImagePath,
  versePath,
  verseRef,
} from "../../src/lib/cita/lookup";
import { parseQuoteSlug } from "../../src/lib/quote-ref";

const PNG_PATH = /^\/citas\/(mt|mc|lc|jn|hch)\/(\d+\.\d+)\.png$/i;
const VERSE_PATH = /^\/citas\/(mt|mc|lc|jn|hch)\/(\d+\.\d+)\/?$/i;
const SLUG_PATH = /^\/citas\/([A-Za-z0-9-]+)$/;
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

async function loadQuote(slug: string) {
  const { findQuoteBySlug } = await import("../../src/lib/quotes-public.server");
  return findQuoteBySlug(slug);
}

function cardFor(quote: { reference: string; body: string }, origin: string, slug: string) {
  const first =
    firstIndexedVerse(quote.reference) ??
    (() => {
      const parsed = parseQuoteSlug(slug);
      return parsed ? getIndexedVerse(parsed.book, `${parsed.chapter}.${parsed.verse}`) : null;
    })();
  if (first) return verseCard(first, origin);
  const title = `${quote.reference} · Evangelio de Hoy`;
  const description = `«${quote.body.slice(0, 180)}${quote.body.length > 180 ? "…" : ""}»`;
  return {
    title,
    description,
    url: `${origin}/citas/${slug}`,
    image: `${origin}/citas/mt/1.1.png`,
    body: quote.body,
    reference: quote.reference,
  };
}

function resolveIndexedVerse(pathname: string) {
  const verseMatch = VERSE_PATH.exec(pathname);
  if (verseMatch) {
    return getIndexedVerse(verseMatch[1]!.toLowerCase(), verseMatch[2]!);
  }
  const slugMatch = SLUG_PATH.exec(pathname);
  if (!slugMatch) return null;
  const parsed = parseQuoteSlug(slugMatch[1]!);
  if (!parsed) return null;
  return getIndexedVerse(parsed.book, `${parsed.chapter}.${parsed.verse}`);
}

function verseCard(
  verse: NonNullable<ReturnType<typeof getIndexedVerse>>,
  origin: string,
) {
  const title = `${verseRef(verse)} · Evangelio de Hoy`;
  const description = `«${verse.text}»`;
  return {
    title,
    description,
    url: `${origin}${versePath(verse)}`,
    image: `${origin}${verseImagePath(verse)}`,
    body: verse.text,
    reference: verseRef(verse),
  };
}

export default async function quoteOgMiddleware(
  event: QuoteOgEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const pathname = event.url.pathname;
  const pngMatch = PNG_PATH.exec(pathname);
  if (pngMatch) {
    const verse = getIndexedVerse(pngMatch[1]!.toLowerCase(), pngMatch[2]!);
    if (!verse) {
      return new Response("Not found", {
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
  const verse = resolveIndexedVerse(pathname);
  const slugMatch = !verse ? SLUG_PATH.exec(pathname) : null;

  if (!verse && !slugMatch) return next();

  if (isCrawler(event)) {
    try {
      if (verse) {
        return new Response(crawlerDocument(verseCard(verse, origin)), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      }
      const quote = await loadQuote(slugMatch![1] ?? "");
      if (quote) {
        return new Response(crawlerDocument(cardFor(quote, origin, slugMatch![1] ?? "")), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      }
      return new Response(
        `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cita no encontrada</title><meta name="robots" content="noindex, nofollow"></head><body>Cita no encontrada</body></html>`,
        {
          status: 404,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store, max-age=0, must-revalidate",
          },
        },
      );
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
    if (verse) {
      const html = await result.text();
      const patched = patchDocument(html, verseCard(verse, origin));
      const headers = new Headers(result.headers);
      headers.delete("content-length");
      return new Response(patched, {
        status: result.status,
        statusText: result.statusText,
        headers,
      });
    }
    const quote = await loadQuote(slugMatch![1] ?? "");
    if (!quote) return result;
    const html = await result.text();
    const patched = patchDocument(html, cardFor(quote, origin, slugMatch![1] ?? ""));
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
