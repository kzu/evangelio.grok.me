import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareButton } from "@/components/share-button";
import { listFavorites, removeFavorite, type FavoriteItem } from "@/lib/favorites";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/favoritos")({ component: Favoritos });

function Favoritos() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<FavoriteItem[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems(null);
      return;
    }
    let cancelled = false;
    void listFavorites()
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
    return <Navigate to="/ingresar" search={{ next: "/favoritos" }} />;
  }

  return (
    <main className="flex flex-1 flex-col bg-bg px-5 py-10 text-fg sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Favoritos</h1>
        <span className="mt-3 block h-px w-12 bg-rule" />
        {items === null ? (
          <p className="mt-8 font-sans text-sm text-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 font-sans text-sm leading-6 text-muted">
            Todavía no guardaste ningún Evangelio. En la lectura del día, tocá el corazón.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {items.map((item) => (
              <li key={`${item.date}-${item.edition}`}>
                <FavoriteRow
                  item={item}
                  onRemoved={() =>
                    setItems((current) =>
                      (current ?? []).filter(
                        (row) => !(row.date === item.date && row.edition === item.edition),
                      ),
                    )
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

function FavoriteRow({ item, onRemoved }: { item: FavoriteItem; onRemoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const label = item.date;
  const sharePath =
    item.edition === "family" ? `/e/${item.date}?familia=1` : `/e/${item.date}`;

  async function unsave() {
    if (busy) return;
    setBusy(true);
    try {
      await removeFavorite({ data: { date: item.date, edition: item.edition } });
      onRemoved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-1">
        <Link
          to="/e/$date"
          params={{ date: item.date }}
          search={{ ...(item.edition === "family" ? { familia: true } : {}) }}
          className="min-w-0 flex-1"
        >
          <p className="font-sans text-xs font-medium uppercase tracking-label text-muted">
            {label}
            {item.edition === "family" ? " · Familiar" : ""}
          </p>
          {item.commentTitle ? (
            <blockquote className="mt-2 font-display text-lg leading-7 italic text-fg">
              {item.commentTitle}
            </blockquote>
          ) : null}
          <p
            className={
              item.commentTitle
                ? "mt-2 font-sans text-sm text-muted"
                : "mt-1 font-display text-lg italic text-primary"
            }
          >
            {item.citation || "Evangelio del día"}
          </p>
          {item.liturgicalDay ? (
            <p className="mt-1 font-sans text-sm text-muted">{item.liturgicalDay}</p>
          ) : null}
        </Link>
        <div className="flex shrink-0">
          <ShareButton url={sharePath} compact ghost />
          <button
            type="button"
            onClick={() => void unsave()}
            disabled={busy}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted transition-transform duration-150 ease-out active:scale-[0.96]"
            aria-label="Quitar de favoritos"
            title="Quitar de favoritos"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
