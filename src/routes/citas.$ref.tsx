import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { ShareButton } from "@/components/share-button";
import { firstIndexedVerse, getIndexedVerse, verseImagePath, verseRef } from "@/lib/cita/lookup";
import { getPublicQuote } from "@/lib/quotes";
import { parseQuoteSlug } from "@/lib/quote-ref";

export const Route = createFileRoute("/citas/$ref")({
  loader: async ({ params }) => {
    const parsed = parseQuoteSlug(params.ref);
    if (parsed) {
      const verse = getIndexedVerse(parsed.book, `${parsed.chapter}.${parsed.verse}`);
      if (verse) {
        throw redirect({
          to: "/citas/$book/$pin",
          params: { book: verse.book, pin: `${verse.chapter}.${verse.verse}` },
        });
      }
    }
    let data: Awaited<ReturnType<typeof getPublicQuote>>;
    try {
      data = await getPublicQuote({ data: { slug: params.ref } });
    } catch {
      throw notFound();
    }
    if (!data.quote) throw notFound();
    const first = firstIndexedVerse(data.quote.reference);
    if (first) {
      throw redirect({
        to: "/citas/$book/$pin",
        params: { book: first.book, pin: `${first.chapter}.${first.verse}` },
      });
    }
    return { quote: data.quote, origin: data.origin, slug: data.slug };
  },
  notFoundComponent: QuoteMissing,
  head: ({ loaderData }) => {
    const quote = loaderData?.quote;
    if (!quote) {
      return {
        meta: [
          { title: "Cita no encontrada" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const origin = loaderData?.origin ?? "";
    const slug = loaderData?.slug ?? "";
    const first = firstIndexedVerse(quote.reference);
    const title = `${(first ? verseRef(first) : quote.reference)} · Evangelio de Hoy`;
    const description = first
      ? `«${first.text}»`
      : `«${quote.body.slice(0, 180)}${quote.body.length > 180 ? "…" : ""}»`;
    const imagePath = first
      ? verseImagePath(first)
      : slug
        ? `/citas/${slug}.png`
        : "";
    const url = origin && slug ? `${origin}/citas/${slug}` : "";
    const image = origin && imagePath ? `${origin}${imagePath}` : imagePath;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Evangelio de Hoy" },
        { property: "og:locale", content: "es_LA" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(url ? [{ property: "og:url", content: url }] : []),
        ...(image
          ? [
              { property: "og:image", content: image },
              { property: "og:image:type", content: "image/png" },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:title", content: title },
              { name: "twitter:description", content: description },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: SharedQuote,
});

function QuoteMissing() {
  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cita no encontrada</h1>
        <p className="mt-4 font-sans text-sm leading-6 text-muted">
          Esa referencia ya no está guardada, o el enlace no es válido.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block font-sans text-sm text-muted underline decoration-rule underline-offset-4"
        >
          Ir al Evangelio de hoy
        </Link>
      </div>
    </main>
  );
}

function SharedQuote() {
  const { quote, slug } = Route.useLoaderData();

  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-8 text-fg sm:px-8">
      <article className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-xl bg-surface px-6 py-8 shadow-card sm:px-10 sm:py-12">
          <p className="font-display text-6xl leading-none text-primary" aria-hidden>
            ”
          </p>
          <blockquote className="mt-4 font-display text-xl leading-9 italic sm:text-2xl sm:leading-10">
            «{quote.body}»
          </blockquote>
          <p className="mt-8 text-right font-sans text-sm font-semibold tracking-[0.18em] text-primary">
            {quote.reference}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ShareButton url={`/citas/${slug}`} />
          <Link
            to="/"
            search={{
              fecha: quote.date,
              ...(quote.edition === "family" ? { familia: true } : {}),
            }}
            className="inline-flex min-h-11 items-center rounded-md px-4 font-sans text-sm text-muted underline decoration-rule underline-offset-4"
          >
            Ver el Evangelio
          </Link>
        </div>
      </article>
    </main>
  );
}
