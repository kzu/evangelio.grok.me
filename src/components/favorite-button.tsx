"use client";

import { useNavigate, useSearch } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/favorites";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { GospelEdition } from "@/lib/gospel/types";
import { cn } from "@/lib/utils";

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

export function FavoriteButton({
  date,
  edition,
  citation,
  liturgicalDay,
}: {
  date: string;
  edition: GospelEdition;
  citation: string;
  liturgicalDay: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const search = useSearch({ from: "/e/$date", shouldThrow: false }) as
    | { favorito?: boolean }
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
    void isFavorite({ data: { date, edition } })
      .then((value) => {
        if (!cancelled) setSaved(value);
      })
      .catch((error) => {
        if (!cancelled && isUnauthorized(error)) setSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, date, edition]);

  useEffect(() => {
    if (!user || !search?.favorito || busy) return;
    let cancelled = false;
    setBusy(true);
    void addFavorite({ data: { date, edition, citation, liturgicalDay } })
      .then(() => {
        if (cancelled) return;
        setSaved(true);
        void navigate({
          to: "/e/$date",
          params: { date },
          search: (prev) => {
            const next = { ...prev } as { familia?: boolean; favorito?: boolean };
            delete next.favorito;
            return next;
          },
          replace: true,
        });
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
  }, [user, search?.favorito, date, edition]);

  function goSignIn() {
    const next = `${window.location.pathname}${window.location.search}`;
    void navigate({
      to: "/ingresar",
      search: { next, accion: "favorito" },
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
      if (next) {
        await addFavorite({ data: { date, edition, citation, liturgicalDay } });
      } else {
        await removeFavorite({ data: { date, edition } });
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
        "inline-flex size-11 items-center justify-center rounded-md bg-surface shadow-border transition-[transform,opacity,color] duration-150 ease-out active:scale-[0.96]",
        saved ? "text-lit-red" : "text-fg",
      )}
      aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={saved}
      title={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
    >
      <Heart
        className="size-4"
        strokeWidth={1.75}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
