import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { MarkCross } from "@/components/mark-cross";
import {
  getAdjacentVerse,
  getIndexedVerse,
  verseBookName,
  verseImagePath,
  versePath,
  verseRef,
  type IndexedVerse,
} from "@/lib/cita/lookup";
import { vaticanChapterUrl } from "@/lib/gospel/vatican-map";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/citas/$book/$pin")({
  loader: async ({ params }) => {
    const verse = getIndexedVerse(params.book, params.pin);
    if (!verse) throw notFound();
    let origin = "https://evangelio.grok.me";
    if (import.meta.env.SSR) {
      const { requestOrigin } = await import("@/lib/quotes-public.server");
      origin = requestOrigin() || origin;
    }
    return {
      verse,
      prev: getAdjacentVerse(verse, -1),
      next: getAdjacentVerse(verse, 1),
      origin,
    };
  },
  notFoundComponent: VerseMissing,
  head: ({ loaderData }) => {
    const verse = loaderData?.verse;
    if (!verse) {
      return {
        meta: [{ title: "Cita no encontrada" }, { name: "robots", content: "noindex, nofollow" }],
      };
    }
    const origin = loaderData.origin.replace(/\/$/, "");
    const title = `${verseRef(verse)} · Evangelio de Hoy`;
    const description = `«${verse.text}»`;
    const url = `${origin}${versePath(verse)}`;
    const image = `${origin}${verseImagePath(verse)}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Evangelio de Hoy" },
        { property: "og:locale", content: "es_LA" },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: CanonVersePage,
});

function VerseMissing() {
  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cita no encontrada</h1>
        <p className="mt-4 font-sans text-sm leading-6 text-muted">
          Ese versículo no está en el índice del Evangelio.
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

function VerseLink({
  target,
  label,
  side,
}: {
  target: IndexedVerse | null;
  label: string;
  side: "prev" | "next";
}) {
  const icon =
    side === "prev" ? (
      <ChevronLeft className="size-6" strokeWidth={1.5} />
    ) : (
      <ChevronRight className="size-6" strokeWidth={1.5} />
    );
  const className = cn(
    "inline-flex size-11 items-center justify-center rounded-md text-primary transition-[opacity,transform] duration-150 ease-out active:scale-[0.96]",
    side === "prev" ? "justify-self-start" : "justify-self-end",
    !target && "pointer-events-none opacity-30",
  );
  if (!target) {
    return (
      <span className={className} aria-hidden>
        {icon}
      </span>
    );
  }
  return (
    <Link
      to="/citas/$book/$pin"
      params={{ book: target.book, pin: `${target.chapter}.${target.verse}` }}
      className={className}
      aria-label={label}
    >
      {icon}
    </Link>
  );
}

function CanonVersePage() {
  const { verse, prev, next } = Route.useLoaderData();
  const reference = verseRef(verse);
  const vaticanUrl = vaticanChapterUrl(verse.book, verse.chapter);

  return (
    <main className="flex flex-1 flex-col bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-20 pt-5 sm:px-8 sm:pt-8">
        <header className="stagger-in">
          <nav
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center"
            aria-label="Versículos"
          >
            <VerseLink target={prev} label="Versículo anterior" side="prev" />
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="flex items-center gap-3 text-muted">
                <span className="h-px w-8 bg-rule" />
                <MarkCross className="h-5 w-3.5" />
                <span className="h-px w-8 bg-rule" />
              </div>
              <p className="mt-3 font-sans text-xs font-medium uppercase tracking-mark text-muted">
                Evangelio según {verseBookName(verse)}
              </p>
              <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-fg sm:text-4xl">
                {reference}
              </h1>
            </div>
            <VerseLink target={next} label="Versículo siguiente" side="next" />
          </nav>
        </header>

        <article className="stagger-in relative mt-4 rounded-xl bg-surface px-6 pb-6 pt-4 shadow-card sm:px-10 sm:pb-10 sm:pt-6">
          <p className="font-sans text-xs font-medium uppercase tracking-label text-muted">
            Lectura del santo Evangelio según {verseBookName(verse)}
          </p>
          <p className="mt-2 font-display text-lg italic text-primary sm:text-xl">{reference}</p>
          <p className="mt-8 font-display text-lg leading-8 text-fg sm:text-xl sm:leading-9">
            <sup className="mr-1 select-none font-sans text-xs font-medium text-subtle">
              {verse.verse}
            </sup>
            {verse.text}
          </p>
          <p className="mt-8 font-display text-base italic text-muted">Palabra del Señor.</p>
        </article>

        <div className="stagger-in mt-8 flex justify-center gap-3">
          <ShareButton url={versePath(verse)} />
        </div>

        <footer className="stagger-in mt-8 border-t border-border pt-6 text-center font-sans text-xs leading-5 text-subtle">
          <p>
            Texto bíblico: <em>El Libro del Pueblo de Dios</em>
            {vaticanUrl ? (
              <>
                {" "}
                (
                <a
                  href={vaticanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Santa Sede
                </a>
                ).
              </>
            ) : (
              "."
            )}
          </p>
          <p className="mt-1">
            <Link
              to="/"
              className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
            >
              Evangelio de hoy
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
