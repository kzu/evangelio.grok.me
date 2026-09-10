import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { MarkCross } from "@/components/mark-cross";
import { ShareButton } from "@/components/share-button";
import { FavoriteButton } from "@/components/favorite-button";
import { GospelPassage } from "@/components/gospel-passage";
import type { DailyGospel, LiturgicalColor } from "@/lib/gospel/types";
import { cn } from "@/lib/utils";
const COLOR_LABEL: Record<LiturgicalColor, string> = {
  green: "Verde",
  white: "Blanco",
  red: "Rojo",
  violet: "Morado",
  rose: "Rosa",
  black: "Negro",
  unknown: "Litúrgico",
};

const COLOR_CLASS: Record<LiturgicalColor, string> = {
  green: "bg-lit-green",
  white: "bg-lit-white",
  red: "bg-lit-red",
  violet: "bg-lit-violet",
  rose: "bg-lit-rose",
  black: "bg-lit-black",
  unknown: "bg-primary",
};

function formatLongDate(iso: string) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const raw = format(parseISO(iso), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return iso;
  }
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export function GospelView({
  gospel,
  adapting = false,
}: {
  gospel: DailyGospel;
  adapting?: boolean;
}) {
  const isToday = gospel.date === todayISO();

  if (gospel.loadError && !gospel.verses.length) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-20 pt-5 sm:px-8 sm:pt-8">
        <GospelError message={gospel.loadError} />
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-20 pt-5 sm:px-8 sm:pt-8">
      <header className="stagger-in">
        <nav
          className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center"
          aria-label="Días del evangelio"
        >
          <DayLink date={gospel.prevDate} label="Anterior" side="prev" />
          <div className="flex min-w-0 flex-col items-center text-center">
            <div className="flex items-center gap-3 text-muted">
              <span className="h-px w-8 bg-rule" />
              <MarkCross className="h-5 w-3.5" />
              <span className="h-px w-8 bg-rule" />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-mark text-muted">
              {gospel.edition === "family" ? "Evangelio familiar" : "Evangelio de hoy"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-fg sm:text-4xl">
              {formatLongDate(gospel.date)}
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0 text-sm leading-snug">
              <span className="inline-flex items-center gap-2 text-muted">
                <span
                  className={cn(
                    "inline-block size-2.5 rounded-full",
                    COLOR_CLASS[gospel.liturgicalColor],
                  )}
                  title={COLOR_LABEL[gospel.liturgicalColor]}
                />
                <span>{gospel.liturgicalDay}</span>
              </span>
              {isToday ? null : (
                <Link
                  to="/"
                  search={(prev) => {
                    const next = { ...prev, fecha: undefined } as {
                      fecha?: string;
                      familia?: boolean;
                      favorito?: boolean;
                      cita?: boolean;
                    };
                    delete next.favorito;
                    delete next.cita;
                    return next;
                  }}
                  className="font-medium text-primary transition-opacity duration-150 hover:opacity-70"
                >
                  Ir a hoy
                </Link>
              )}
            </div>
          </div>
          <DayLink date={gospel.nextDate} label="Siguiente" side="next" />
        </nav>
      </header>

      <article className="stagger-in relative mt-4 rounded-xl bg-surface px-6 pb-6 pt-4 shadow-card sm:px-10 sm:pb-10 sm:pt-6">
        <div
          className={cn(
            "absolute inset-y-4 left-0 w-1 rounded-r-full",
            COLOR_CLASS[gospel.liturgicalColor],
          )}
          aria-hidden="true"
        />
        <p className="font-sans text-xs font-medium uppercase tracking-label text-muted">
          Lectura del santo Evangelio según {gospel.bookName}
        </p>
        <p className="mt-2 font-display text-lg italic text-primary sm:text-xl">
          {gospel.citation}
        </p>

        <GospelPassage
          verses={gospel.verses}
          book={gospel.book}
          citation={gospel.citation}
          date={gospel.date}
          edition={gospel.edition}
        />

        <p className="mt-8 font-display text-base italic text-muted">Palabra del Señor.</p>
        <p className="mt-6 font-sans text-xs leading-5 text-subtle">
          {gospel.source === "family" ? (
            <>
              Texto abreviado y comentario:{" "}
              <a
                href={gospel.evangeliUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
              >
                family.evangeli.net
              </a>
            </>
          ) : gospel.source === "vatican" ? (
            <>
              Texto: <em>El Libro del Pueblo de Dios</em>
              {gospel.vaticanUrl ? (
                <>
                  {" · "}
                  <a
                    href={gospel.vaticanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
                  >
                    Santa Sede
                  </a>
                </>
              ) : null}
            </>
          ) : (
            <>Texto según la lectura litúrgica de evangeli.net</>
          )}
        </p>
      </article>

      {gospel.commentary.length > 0 ? (
        <section className="stagger-in mt-8 flex flex-col gap-5">
          <SectionTitle>Comentario</SectionTitle>
          {gospel.commentTitle ? (
            <p className="font-display text-xl italic text-primary">{gospel.commentTitle}</p>
          ) : null}
          {gospel.authorName ? (
            <p className="font-sans text-sm text-muted">
              {gospel.authorName}
              {gospel.authorOrigin ? ` ${gospel.authorOrigin}` : ""}
            </p>
          ) : null}
          {gospel.adaptedLatino ? (
            <p className="font-sans text-xs text-subtle">
              Adaptado al español latinoamericano
            </p>
          ) : adapting ? (
            <p className="font-sans text-xs text-subtle">
              Adaptando al español latinoamericano…
            </p>
          ) : null}
          <div className="flex flex-col gap-4 font-sans text-lg leading-8 text-fg sm:text-xl sm:leading-9">
            {gospel.commentary.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {gospel.thoughts.length > 0 ? (
        <section className="stagger-in mt-8 flex flex-col gap-5">
          <SectionTitle>Pensamientos para el Evangelio de hoy</SectionTitle>
          <ul className="flex flex-col gap-4">
            {gospel.thoughts.map((thought) => (
              <li
                key={thought.quote.slice(0, 40)}
                className="rounded-lg bg-bg-elevated px-5 py-5 shadow-card"
              >
                <blockquote className="font-display text-lg leading-8 italic text-fg">
                  «{thought.quote}»
                </blockquote>
                {thought.source ? (
                  <cite className="mt-3 block font-sans text-sm not-italic text-muted">
                    {thought.source}
                  </cite>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="stagger-in mt-8 flex justify-center gap-3">
        <FavoriteButton
          date={gospel.date}
          edition={gospel.edition}
          citation={gospel.citation}
          liturgicalDay={gospel.liturgicalDay}
        />
        <ShareButton />
      </div>

      <footer className="stagger-in mt-8 border-t border-border pt-6 text-center font-sans text-xs leading-5 text-subtle">
        <p>
          {gospel.source === "family" ? (
            <>
              Versión familiar:{" "}
              <a
                href={gospel.evangeliUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
              >
                family.evangeli.net
              </a>
            </>
          ) : (
            <>
              Lectura del día y comentario:{" "}
              <a
                href={gospel.evangeliUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-rule underline-offset-4 transition-opacity hover:opacity-70"
              >
                evangeli.net
              </a>
            </>
          )}
        </p>
        {gospel.source === "family" ? (
          <p className="mt-1">Texto más breve, pensado para leer en familia.</p>
        ) : (
          <p className="mt-1">
            Texto bíblico: El Libro del Pueblo de Dios (traducción argentina, Libreria Editrice
            Vaticana).
          </p>
        )}
        {gospel.adaptedLatino ? (
          <p className="mt-1">
            {gospel.source === "family"
              ? "Texto y comentario adaptados al español latinoamericano."
              : "Comentario y pensamientos adaptados al español latinoamericano."}
          </p>
        ) : null}
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-medium tracking-tight">{children}</h2>
      <span className="mt-3 block h-px w-12 bg-rule" />
    </div>
  );
}

function DayLink({
  date,
  label,
  side,
}: {
  date: string | null;
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
    !date && "pointer-events-none opacity-30",
  );

  if (!date) {
    return (
      <span className={className} aria-hidden="true">
        {icon}
      </span>
    );
  }

  return (
    <Link
      to="/"
      search={(prev) => {
        const next = { ...prev, fecha: date } as {
          fecha?: string;
          familia?: boolean;
          favorito?: boolean;
          cita?: boolean;
        };
        delete next.favorito;
        delete next.cita;
        return next;
      }}
      className={className}
      aria-label={label}
    >
      {icon}
    </Link>
  );
}

export function GospelSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-8">
      <MarkCross className="h-5 w-3.5 text-subtle" />
      <div className="h-3 w-40 animate-pulse rounded-full bg-border" />
      <div className="h-8 w-64 animate-pulse rounded-full bg-border" />
      <div className="mt-4 w-full rounded-xl bg-surface p-8 shadow-card">
        <div className="h-3 w-48 animate-pulse rounded-full bg-border" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-border" />
          <div className="h-4 w-[94%] animate-pulse rounded-full bg-border" />
          <div className="h-4 w-[88%] animate-pulse rounded-full bg-border" />
          <div className="h-4 w-[72%] animate-pulse rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}

export function GospelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <MarkCross className="h-6 w-4 text-muted" />
      <h1 className="font-display text-2xl font-medium">No se pudo cargar el Evangelio</h1>
      <p className="font-sans text-sm leading-6 text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-sans text-sm font-medium text-primary-fg transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <RotateCcw className="size-4" strokeWidth={1.75} />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
