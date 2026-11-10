"use client";

import { Search, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { parseVerseQuery } from "@/lib/verse-search";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Ej. Mateo 7:16";
const PHONE_QUERY = "(max-width: 639px), ((pointer: coarse) and (hover: none))";

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function phoneSnapshot() {
  return window.matchMedia(PHONE_QUERY).matches;
}

export function VerseSearch() {
  const navigate = useNavigate();
  const phone = useSyncExternalStore(subscribePhone, phoneSnapshot, () => false);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!modal) return;
    const id = window.setTimeout(() => areaRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [modal]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(raw: string): boolean {
    const slug = parseVerseQuery(raw);
    if (!slug) {
      setError("No reconozco esa cita. Probá Mateo 7:16 o Mateo 7:16-20.");
      return false;
    }
    setError("");
    setQuery("");
    setOpen(false);
    setModal(false);
    void navigate({ to: "/biblia/$slug", params: { slug } });
    return true;
  }

  const sheet =
    modal && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-fg/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verse-search-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-fg/50 backdrop-blur-sm"
              aria-label="Cerrar"
              onClick={() => setModal(false)}
            />
            <form
              className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-4 text-fg shadow-card"
              onSubmit={(event) => {
                event.preventDefault();
                go(query);
              }}
            >
              <div className="flex items-center gap-2">
                <h2 id="verse-search-title" className="min-w-0 flex-1 font-sans text-base font-semibold">
                  Buscar
                </h2>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-md text-muted"
                  aria-label="Cerrar"
                  onClick={() => setModal(false)}
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
              <textarea
                ref={areaRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (error) setError("");
                }}
                rows={4}
                placeholder={PLACEHOLDER}
                aria-label="Buscar evangelio, capítulo y versículo"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(
                  "mt-3 w-full resize-none rounded-md bg-bg px-3 py-2 font-sans text-base text-fg outline-none placeholder:text-subtle",
                  error && "ring-1 ring-lit-red",
                )}
              />
              {error ? (
                <p id={errorId} role="alert" className="mt-2 font-sans text-sm text-lit-red">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 font-sans text-sm font-medium text-primary-fg"
              >
                <Search className="size-4" strokeWidth={1.75} />
                Buscar
              </button>
            </form>
          </div>,
          document.body,
        )
      : null;

  if (phone) {
    return (
      <>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
          aria-label="Buscar"
          title="Buscar"
          onClick={() => {
            setError("");
            setModal(true);
          }}
        >
          <Search className="size-4" strokeWidth={1.75} />
        </button>
        {sheet}
      </>
    );
  }

  return (
    <div ref={rootRef} className="relative flex items-center">
      <form
        className="flex items-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            return;
          }
          go(query);
        }}
      >
        <div
          className={cn(
            "grid transition-[grid-template-columns,opacity] duration-200 ease-out",
            open ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
          )}
        >
          <div className="min-w-0 overflow-hidden">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError("");
              }}
              placeholder={PLACEHOLDER}
              tabIndex={open ? 0 : -1}
              aria-hidden={open ? undefined : true}
              aria-label="Buscar evangelio, capítulo y versículo"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cn(
                "mr-2 h-11 w-44 rounded-md bg-surface px-3 font-sans text-sm text-fg shadow-border outline-none placeholder:text-subtle",
                error && "ring-1 ring-lit-red",
              )}
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
          aria-label="Buscar"
          title="Buscar"
          aria-expanded={open}
        >
          <Search className="size-4" strokeWidth={1.75} />
        </button>
        {error && open ? (
          <p
            id={errorId}
            role="alert"
            className="absolute right-0 top-full z-40 mt-1 w-max max-w-xs rounded-md bg-surface px-2 py-1 font-sans text-xs text-lit-red shadow-card"
          >
            {error}
          </p>
        ) : null}
      </form>
      {sheet}
    </div>
  );
}
