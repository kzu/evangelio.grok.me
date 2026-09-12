"use client";

import { useNavigate, useSearch } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/favorites";
import { addQuote, isQuote, removeQuote, type QuoteInput } from "@/lib/quotes";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { GospelEdition } from "@/lib/gospel/types";
import { todayISO } from "@/lib/gospel/today";
import { stashPendingQuote } from "@/lib/pending-quote";
import { cn } from "@/lib/utils";

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

export type QuoteFavorite = {
  reference: string;
  body: string;
  book: string;
  verseStart: number;
  verseEnd: number;
  chapterStart: number;
  chapterEnd: number;
};

type GospelProps = {
  date: string;
  edition: GospelEdition;
  citation: string;
  liturgicalDay: string;
  quote?: undefined;
};

type QuoteProps = {
  quote: QuoteFavorite;
  date?: undefined;
  edition?: undefined;
  citation?: undefined;
  liturgicalDay?: undefined;
};

function quotePayload(quote: QuoteFavorite): QuoteInput {
  return {
    date: todayISO(),
    edition: "adult",
    book: quote.book,
    reference: quote.reference,
    mode: "verse",
    body: quote.body,
    verseStart: quote.verseStart,
    verseEnd: quote.verseEnd,
    chapterStart: quote.chapterStart,
    chapterEnd: quote.chapterEnd,
  };
}

export function FavoriteButton(props: GospelProps | QuoteProps) {
  const quote = props.quote;
  const { user, isPending } = useCurrentUserState();
  const gospelSearch = useSearch({ from: "/e/$date", shouldThrow: false }) as
    | { favorito?: boolean }
    | undefined;
  const bibliaSearch = useSearch({ from: "/biblia/$slug", shouldThrow: false }) as
    | { cita?: boolean }
    | undefined;
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    const check = quote
      ? isQuote({ data: { reference: quote.reference } })
      : isFavorite({ data: { date: props.date, edition: props.edition } });
    void check
      .then((value) => {
        if (!cancelled) setSaved(value);
      })
      .catch((error) => {
        if (!cancelled && isUnauthorized(error)) setSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, quote?.reference, props.date, props.edition]);

  useEffect(() => {
    if (!user || busy) return;
    if (quote) {
      if (!bibliaSearch?.cita) return;
    } else if (!gospelSearch?.favorito) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    const save = quote
      ? addQuote({ data: quotePayload(quote) }).then(() => undefined)
      : addFavorite({
          data: {
            date: props.date,
            edition: props.edition,
            citation: props.citation,
            liturgicalDay: props.liturgicalDay,
          },
        });
    void save
      .then(() => {
        if (cancelled) return;
        setSaved(true);
        if (quote) {
          void navigate({
            to: "/biblia/$slug",
            params: { slug: quote.reference },
            search: {},
            replace: true,
          });
        } else {
          void navigate({
            to: "/e/$date",
            params: { date: props.date },
            search: (prev) => {
              const next = { ...prev } as { familia?: boolean; favorito?: boolean };
              delete next.favorito;
              return next;
            },
            replace: true,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (isUnauthorized(error)) goSignIn();
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retry once per landing
  }, [user, gospelSearch?.favorito, bibliaSearch?.cita, quote?.reference, props.date, props.edition]);

  function goSignIn() {
    const next = `${window.location.pathname}${window.location.search}`;
    if (quote) stashPendingQuote(quotePayload(quote));
    void navigate({
      to: "/ingresar",
      search: { next, accion: quote ? "cita" : "favorito" },
    });
  }

  async function onToggle() {
    if (busy) return;
    if (isPending || !user) {
      goSignIn();
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      if (quote) {
        if (next) await addQuote({ data: quotePayload(quote) });
        else await removeQuote({ data: { reference: quote.reference } });
      } else if (next) {
        await addFavorite({
          data: {
            date: props.date,
            edition: props.edition,
            citation: props.citation,
            liturgicalDay: props.liturgicalDay,
          },
        });
      } else {
        await removeFavorite({ data: { date: props.date, edition: props.edition } });
      }
    } catch (error) {
      setSaved(!next);
      if (isUnauthorized(error)) goSignIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      disabled={busy && Boolean(user)}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface px-4 font-sans text-sm font-medium shadow-border transition-[transform,opacity,color] duration-150 ease-out active:scale-[0.96]",
        saved ? "text-lit-red" : "text-fg",
      )}
      aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={saved}
      title={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
    >
      <Heart
        className="size-4 shrink-0"
        strokeWidth={1.75}
        fill={saved ? "currentColor" : "none"}
      />
      Favorito
    </button>
  );
}
