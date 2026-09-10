"use client";

import { Link, Navigate } from "@tanstack/react-router";
import { Heart, LogIn, Quote } from "lucide-react";
import { authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { safeNextPath, withCitaParam, withFavoritoParam } from "@/lib/safe-next";

export function SignInPanel({
  next,
  reason,
}: {
  next?: string;
  reason?: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const destination = safeNextPath(next);
  const favorite = reason === "favorito";
  const quote = reason === "cita";
  const callbackURL = favorite
    ? withFavoritoParam(destination)
    : quote
      ? withCitaParam(destination)
      : destination;

  if (!isPending && user) {
    const url = new URL(callbackURL, "https://evangelio.local");
    const search = Object.fromEntries(url.searchParams.entries());
    return <Navigate to={url.pathname} search={search} replace />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-16 text-fg">
      <div className="w-full max-w-sm space-y-5 text-center">
        {favorite ? (
          <Heart className="mx-auto size-8 text-lit-red" strokeWidth={1.5} />
        ) : quote ? (
          <Quote className="mx-auto size-8 text-primary" strokeWidth={1.5} />
        ) : null}
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {favorite ? "Para guardar favoritos" : quote ? "Para guardar citas" : "Ingresar"}
        </h1>
        <p className="font-sans text-sm leading-6 text-muted">
          {favorite
            ? "La lista de favoritos es personal. Iniciá sesión con Google para guardar este Evangelio y verlo después."
            : quote
              ? "Las citas se guardan en tu cuenta. Iniciá sesión con Google para guardar este versículo y verlo después."
              : "Entrá con Google para guardar tu sesión en este dispositivo."}
        </p>
        {authEnabled ? (
          <button
            type="button"
            onClick={() => void signIn("grok-google", { callbackURL })}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-sans text-sm font-medium text-primary-fg transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            <LogIn className="size-4" strokeWidth={1.75} />
            Iniciar sesión con Google
          </button>
        ) : (
          <p className="font-sans text-sm text-muted">El ingreso no está habilitado.</p>
        )}
        <Link
          to="/"
          className="inline-block font-sans text-sm text-muted underline decoration-rule underline-offset-4"
        >
          Volver al Evangelio
        </Link>
      </div>
    </main>
  );
}
