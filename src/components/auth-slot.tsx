"use client";

import { Link } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Heart, LogIn, LogOut, Quote } from "lucide-react";
import { useState } from "react";
import { signIn, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return (
      <div
        className="size-11 animate-pulse rounded-md bg-surface shadow-border"
        aria-hidden="true"
      />
    );
  }

  if (user) {
    const label = user.displayName ?? user.primaryEmail ?? "Cuenta";
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center overflow-hidden rounded-md bg-surface shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
            aria-label={`Cuenta de ${label}`}
            title={label}
          >
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="size-11 object-cover" />
            ) : (
              <span className="font-sans text-sm font-medium text-fg">
                {label.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-40 rounded-md border border-border bg-surface p-1 shadow-card"
          >
            <DropdownMenu.Item asChild>
              <Link
                to="/citas"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2.5 font-sans text-sm text-fg outline-none data-[highlighted]:bg-bg"
              >
                <Quote className="size-4" strokeWidth={1.75} />
                Citas
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                to="/favoritos"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2.5 font-sans text-sm text-fg outline-none data-[highlighted]:bg-bg"
              >
                <Heart className="size-4" strokeWidth={1.75} />
                Favoritos
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={signingOut}
              onSelect={() => {
                setSigningOut(true);
                void signOut().catch(() => setSigningOut(false));
              }}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2.5 font-sans text-sm text-fg outline-none data-[highlighted]:bg-bg data-[disabled]:opacity-50"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              {signingOut ? "Saliendo…" : "Salir"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signIn("grok-google", { callbackURL: "/" })}
      className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
      aria-label="Ingresar con Google"
      title="Ingresar"
    >
      <LogIn className="size-4" strokeWidth={1.75} />
    </button>
  );
}
