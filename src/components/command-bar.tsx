"use client";

import { Baby, Home, Moon, Sun } from "lucide-react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { isIsoDate, todayISO } from "@/lib/gospel/today";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { PwaInstallHeaderButton } from "@/components/pwa-install-prompt";
import { AuthSlot } from "@/components/auth-slot";
import { cn } from "@/lib/utils";
import {
  FAMILY_KEY,
  SCALE_KEY,
  SCALES,
  SCALE_VALUES,
  THEME_COLOR,
  THEME_KEY,
} from "@/lib/prefs-boot";

function readTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* private mode */
  }
  return "light";
}

function readScale(): number {
  try {
    const stored = localStorage.getItem(SCALE_KEY);
    if (stored && SCALE_VALUES.includes(stored)) return Number(stored);
  } catch {
    /* private mode */
  }
  return 1;
}

function readFamily(): boolean {
  try {
    return localStorage.getItem(FAMILY_KEY) === "family";
  } catch {
    return false;
  }
}

function setThemeColor(theme: "light" | "dark") {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

function applyThemeToDom(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  setThemeColor(theme);
}

function applyScaleToDom(scale: number) {
  document.documentElement.style.setProperty("--text-scale", String(scale));
}

export function CommandBar() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { familia?: boolean };
  const params = useParams({ strict: false }) as { date?: string };
  const gospelDate = isIsoDate(params.date ?? "") ? params.date! : todayISO();
  const onGospel = isIsoDate(params.date ?? "");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [scale, setScale] = useState(1);
  const [family, setFamily] = useState(() => Boolean(search.familia));

  useLayoutEffect(() => {
    const nextTheme = readTheme();
    const nextScale = readScale();
    applyThemeToDom(nextTheme);
    applyScaleToDom(nextScale);
    setTheme(nextTheme);
    setScale(nextScale);
  }, []);

  useLayoutEffect(() => {
    if (!onGospel) return;
    const nextFamily = readFamily() || Boolean(search.familia);
    setFamily(nextFamily);
    if (nextFamily && !search.familia) {
      void navigate({
        to: "/e/$date",
        params: { date: gospelDate },
        search: { familia: true },
        replace: true,
      });
    }
  }, [onGospel, gospelDate, search.familia, navigate]);

  function applyTheme(next: "light" | "dark") {
    localStorage.setItem(THEME_KEY, next);
    applyThemeToDom(next);
    setTheme(next);
  }

  function applyScale(next: number) {
    localStorage.setItem(SCALE_KEY, String(next));
    applyScaleToDom(next);
    setScale(next);
  }

  function applyFamily(next: boolean) {
    localStorage.setItem(FAMILY_KEY, next ? "family" : "adult");
    setFamily(next);
    void navigate({
      to: "/e/$date",
      params: { date: gospelDate },
      search: { familia: next ? true : undefined },
      replace: true,
    });
  }

  const scaleIndex = SCALES.indexOf(scale as (typeof SCALES)[number]);
  const atMin = scaleIndex <= 0;
  const atMax = scaleIndex === SCALES.length - 1;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md [--text-scale:1]">
      <div className="mx-auto flex h-12 w-full max-w-2xl items-center gap-2 px-4 sm:px-8">
        <Link
          to="/"
          search={family ? { familia: true } : {}}
          aria-label="Evangelio de hoy"
          title="Evangelio de hoy"
          className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
        >
          <Home className="size-4" strokeWidth={1.75} />
        </Link>
        <div className="ml-auto flex items-center gap-2">
        <PwaInstallHeaderButton />
        {onGospel ? (
          <button
            type="button"
            onClick={() => applyFamily(!family)}
            aria-pressed={family}
            aria-label={family ? "Volver al Evangelio completo" : "Ver Evangelio familiar"}
            title={family ? "Versión familiar (activa)" : "Versión familiar"}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md shadow-border transition-[transform,opacity,background-color,color] duration-150 ease-out active:scale-[0.96]",
              family ? "bg-primary text-primary-fg" : "bg-surface text-fg",
            )}
          >
            <Baby className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}

        <div className="flex overflow-hidden rounded-md shadow-border">
          <ScaleButton
            label="Reducir texto"
            disabled={atMin}
            onClick={() => {
              if (!atMin) applyScale(SCALES[scaleIndex - 1]);
            }}
          >
            <span className="font-display text-sm leading-none">A</span>
            <span className="sr-only">−</span>
          </ScaleButton>
          <span className="w-px self-stretch bg-border" aria-hidden="true" />
          <ScaleButton
            label="Aumentar texto"
            disabled={atMax}
            onClick={() => {
              if (!atMax) applyScale(SCALES[scaleIndex + 1]);
            }}
          >
            <span className="font-display text-lg leading-none">A</span>
            <span className="sr-only">+</span>
          </ScaleButton>
        </div>

        <button
          type="button"
          onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
          aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? (
            <Sun className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4" strokeWidth={1.75} />
          )}
        </button>

        <AuthSlot />
        </div>
      </div>
    </header>
  );
}

function ScaleButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center bg-surface text-fg transition-[transform,opacity] duration-150 ease-out",
        disabled ? "opacity-35" : "active:scale-[0.96]",
      )}
    >
      {children}
    </button>
  );
}
