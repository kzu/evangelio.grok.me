import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { MarkCross } from "@/components/mark-cross";
import { adjacentVerseInBook, versesFromBook } from "@/lib/biblia/verses";
import { displayUsfmBook } from "@/lib/biblia/usfm";
import { vaticanChapterUrl } from "@/lib/gospel/vatican-map";
import type { GospelVerse } from "@/lib/gospel/types";
import { displayUsfmRef, firstVerseSlug, parseUsfmSlug } from "@/lib/quote-ref";
import { cn } from "@/lib/utils";

type Neighbor = { slug: string } | null;

export const Route = createFileRoute("/biblia/$slug")({
  loader: async ({ params }) => {
    const parsed = parseUsfmSlug(params.slug);
    if (!parsed) throw notFound();
    const { loadBibliaBook } = await import("@/lib/biblia/load.server");
    const book = loadBibliaBook(parsed.usfm);
    if (!book) throw notFound();
    const verses = versesFromBook(book, parsed.ranges);
    if (!verses.length) throw notFound();
    const first = verses[0]!;
    const last = verses[verses.length - 1]!;
    const prevHit = adjacentVerseInBook(book, first.chapter, first.number, -1);
    const nextHit = adjacentVerseInBook(book, last.chapter, last.number, 1);
    return {
      ref: parsed,
      verses,
      prev: prevHit ? { slug: `${parsed.usfm}.${prevHit.chapter}.${prevHit.verse}` } : null,
      next: nextHit ? { slug: `${parsed.usfm}.${nextHit.chapter}.${nextHit.verse}` } : null,
    };
  },
  notFoundComponent: FragmentMissing,
  head: ({ loaderData }) => {
    const data = loaderData;
    if (!data) {
      return {
        meta: [{ title: "Cita no encontrada" }, { name: "robots", content: "noindex, nofollow" }],
      };
    }
    const title = `${displayUsfmRef(data.ref)} · Evangelio de Hoy`;
    const first = data.verses[0]!;
    const description = `«${first.text}»`;
    const image = `/citas/${firstVerseSlug(data.ref)}.png`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Evangelio de Hoy" },
        { property: "og:locale", content: "es_LA" },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
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
  component: BibliaFragment,
});

function FragmentMissing() {
  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cita no encontrada</h1>
        <p className="mt-4 font-sans text-sm leading-6 text-muted">
          Esa referencia no está en el texto bíblico.
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

function NeighborLink({
  target,
  label,
  side,
}: {
  target: Neighbor;
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
    <Link to="/biblia/$slug" params={{ slug: target.slug }} className={className} aria-label={label}>
      {icon}
    </Link>
  );
}

function workTitle(usfm: string) {
  const name = displayUsfmBook(usfm);
  if (usfm === "ACT") return "Hechos de los Apóstoles";
  if (usfm === "MAT" || usfm === "MRK" || usfm === "LUK" || usfm === "JHN") {
    return `Evangelio según ${
      usfm === "MAT" ? "san Mateo" : usfm === "MRK" ? "san Marcos" : usfm === "LUK" ? "san Lucas" : "san Juan"
    }`;
  }
  return name;
}

function readingLabel(usfm: string) {
  if (usfm === "ACT") return "Lectura de los Hechos de los Apóstoles";
  if (usfm === "MAT" || usfm === "MRK" || usfm === "LUK" || usfm === "JHN") {
    return `Lectura del santo Evangelio según ${
      usfm === "MAT" ? "san Mateo" : usfm === "MRK" ? "san Marcos" : usfm === "LUK" ? "san Lucas" : "san Juan"
    }`;
  }
  return `Lectura de ${displayUsfmBook(usfm)}`;
}

function BibliaFragment() {
  const { ref, verses, prev, next } = Route.useLoaderData();
  const reference = displayUsfmRef(ref);
  const vaticanUrl = vaticanChapterUrl(ref.usfm, verses[0]?.chapter ?? 1);

  return (
    <main className="flex flex-1 flex-col bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-20 pt-5 sm:px-8 sm:pt-8">
        <header className="stagger-in">
          <nav
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center"
            aria-label="Versículos"
          >
            <NeighborLink target={prev} label="Versículo anterior" side="prev" />
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="flex items-center gap-3 text-muted">
                <span className="h-px w-8 bg-rule" />
                <MarkCross className="h-5 w-3.5" />
                <span className="h-px w-8 bg-rule" />
              </div>
              <p className="mt-3 font-sans text-xs font-medium uppercase tracking-mark text-muted">
                {workTitle(ref.usfm)}
              </p>
              <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-fg sm:text-4xl">
                {reference}
              </h1>
            </div>
            <NeighborLink target={next} label="Versículo siguiente" side="next" />
          </nav>
        </header>

        <article className="stagger-in relative mt-4 rounded-xl bg-surface px-6 pb-6 pt-4 shadow-card sm:px-10 sm:pb-10 sm:pt-6">
          <p className="font-sans text-xs font-medium uppercase tracking-label text-muted">
            {readingLabel(ref.usfm)}
          </p>
          <p className="mt-2 font-display text-lg italic text-primary sm:text-xl">{reference}</p>
          <div className="mt-8 font-display text-lg leading-8 text-fg sm:text-xl sm:leading-9">
            {verses.map((verse: GospelVerse, i: number) => (
              <span key={`${verse.chapter}.${verse.number}`}>
                <sup className="mr-1 select-none font-sans text-xs font-medium text-subtle">
                  {verse.number}
                </sup>
                {verse.text}
                {i < verses.length - 1 ? " " : ""}
              </span>
            ))}
          </div>
          <p className="mt-8 font-display text-base italic text-muted">
            {ref.usfm === "ACT" ? "Palabra de Dios." : "Palabra del Señor."}
          </p>
        </article>

        <div className="stagger-in mt-8 flex justify-center gap-3">
          <ShareButton url={`/biblia/${ref.slug}`} />
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
