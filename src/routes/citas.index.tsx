import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareButton } from "@/components/share-button";
import { listQuotes, removeQuote, type QuoteItem } from "@/lib/quotes";
import { displayQuoteReference, quoteSharePath, toUsfmSlug } from "@/lib/quote-ref";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/citas/")({ component: Citas });

function Citas() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<QuoteItem[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems(null);
      return;
    }
    let cancelled = false;
    void listQuotes()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isPending) {
    return (
      <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-8 w-40 animate-pulse rounded-md bg-surface" />
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-surface" />
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/ingresar" search={{ next: "/citas", accion: "cita" }} />;
  }

  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Citas</h1>
        <span className="mt-3 block h-px w-12 bg-rule" />
        {items === null ? (
          <p className="mt-8 font-sans text-sm text-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 font-sans text-sm leading-6 text-muted">
            Todavía no guardaste citas. Seleccioná un versículo en el Evangelio para
            guardarlo.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <QuoteRow
                  item={item}
                  onRemoved={() =>
                    setItems((current) => (current ?? []).filter((row) => row.id !== item.id))
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/"
          className="mt-10 inline-block font-sans text-sm text-muted underline decoration-rule underline-offset-4"
        >
          Volver al Evangelio
        </Link>
      </div>
    </main>
  );
}

function QuoteRow({ item, onRemoved }: { item: QuoteItem; onRemoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const label = item.date;
  const sharePath = quoteSharePath(item.reference);

  async function unsave() {
    if (busy) return;
    setBusy(true);
    try {
      await removeQuote({ data: { id: item.id } });
      onRemoved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-1">
        <Link
          to="/biblia/$slug"
          params={{ slug: toUsfmSlug(item.reference) ?? item.reference }}
          className="min-w-0 flex-1"
        >
          <p className="font-sans text-xs font-medium uppercase tracking-label text-muted">
            {displayQuoteReference(item.reference)}
            {item.mode === "selection" ? " · Selección" : ""}
          </p>
          <blockquote className="mt-2 font-display text-lg leading-8 italic text-fg">
            «{item.body}»
          </blockquote>
          <p className="mt-3 font-sans text-sm text-muted">{label}</p>
        </Link>
        <div className="flex shrink-0">
          <ShareButton url={sharePath} compact ghost />
          <button
            type="button"
            onClick={() => void unsave()}
            disabled={busy}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted transition-transform duration-150 ease-out active:scale-[0.96]"
            aria-label="Eliminar cita"
            title="Eliminar cita"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
