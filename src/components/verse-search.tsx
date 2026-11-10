"use client";

import { Search, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { parseVerseQuery } from "@/lib/verse-search";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Ej. Mateo 7:16";

export function VerseSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (modal) areaRef.current?.focus();
  }, [modal]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <>
      <form
        ref={formRef}
        className="relative hidden items-center sm:flex"
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

      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96] sm:hidden"
        aria-label="Buscar"
        title="Buscar"
        onClick={() => {
          setError("");
          setModal(true);
        }}
      >
        <Search className="size-4" strokeWidth={1.75} />
      </button>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-fg/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verse-search-title"
        >
          <form
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 text-fg shadow-card"
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
        </div>
      ) : null}
    </>
  );
}
