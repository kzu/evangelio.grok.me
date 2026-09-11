"use client";

import { useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatUsfmSlugFromCita } from "@/lib/quote-ref";
import type { GospelBook, GospelEdition, GospelVerse } from "@/lib/gospel/types";
import { clearPendingQuote, readPendingQuote, stashPendingQuote } from "@/lib/pending-quote";
import { addQuote, type QuoteInput } from "@/lib/quotes";

function normalizeQuoteText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function nodeOverlapsRange(node: Node, range: Range): boolean {
  try {
    if (typeof range.intersectsNode === "function" && range.intersectsNode(node)) {
      return true;
    }
  } catch {
    /* Safari can throw on disconnected nodes */
  }
  try {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    return (
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0 &&
      range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0
    );
  } catch {
    return false;
  }
}

function rangeContainsNodeContents(range: Range, node: Node): boolean {
  try {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
    );
  } catch {
    return false;
  }
}

function overlappingVerseNodes(root: HTMLElement, range: Range): HTMLElement[] {
  const hits: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>("[data-verse-index]").forEach((node) => {
    if (nodeOverlapsRange(node, range)) hits.push(node);
  });
  hits.sort((a, b) => Number(a.dataset.verseIndex) - Number(b.dataset.verseIndex));
  return hits;
}

/** Snap a gospel-only selection to whole verse(s) when none is fully selected. */
function expandGospelSelectionIfNeeded(root: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer;
  const ancestorEl = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentNode;
  if (!ancestorEl || !root.contains(ancestorEl)) return;

  const hits = overlappingVerseNodes(root, range);
  if (!hits.length) return;
  if (hits.some((node) => rangeContainsNodeContents(range, node))) return;

  const next = document.createRange();
  next.setStartBefore(hits[0]!);
  next.setEndAfter(hits[hits.length - 1]!);
  selection.removeAllRanges();
  selection.addRange(next);
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

function goToSignIn(payload: QuoteInput, navigate: ReturnType<typeof useNavigate>) {
  stashPendingQuote(payload);
  const next = `${window.location.pathname}${window.location.search}`;
  void navigate({ to: "/ingresar", search: { next, accion: "cita" } });
}

type FloatState = {
  top: number;
  left: number;
  verseCount: number;
  exact: boolean;
  payloadVerse: QuoteInput;
  payloadSelection: QuoteInput;
};

function PendingQuoteFlush({
  date,
  onSaved,
}: {
  date: string;
  onSaved: (created: boolean) => void;
}) {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const search = useSearch({ from: "/e/$date", shouldThrow: false }) as
    | { cita?: boolean }
    | undefined;

  useEffect(() => {
    if (!user || !search?.cita) return;
    const pending = readPendingQuote();
    if (!pending) {
      void navigate({
        to: "/e/$date",
        params: { date },
        search: (prev) => {
          const next = { ...prev } as { familia?: boolean; cita?: boolean };
          delete next.cita;
          return next;
        },
        replace: true,
      });
      return;
    }
    let cancelled = false;
    void addQuote({ data: pending })
      .then((result) => {
        if (cancelled) return;
        clearPendingQuote();
        onSavedRef.current(result.created !== false);
      })
      .catch((error) => {
        if (isUnauthorized(error)) goToSignIn(pending, navigate);
      })
      .finally(() => {
        void navigate({
          to: "/e/$date",
          params: { date: pending.date || date },
          search: (prev) => {
            const next = { ...prev } as { familia?: boolean; cita?: boolean };
            delete next.cita;
            return next;
          },
          replace: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, search?.cita, navigate, date]);

  return null;
}

function QuoteSaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.2 7c-2.3 1.4-3.8 3.4-3.8 5.6 0 2.1 1.6 3.7 3.6 3.7 1.9 0 3.4-1.5 3.4-3.4S9.6 9.5 7.8 9.4c.2-1.1 1.3-2.2 3.2-3.3L8.2 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M17 7c-2.3 1.4-3.8 3.4-3.8 5.6 0 2.1 1.6 3.7 3.6 3.7 1.9 0 3.4-1.5 3.4-3.4s-1.4-3.4-3.2-3.5c.2-1.1 1.3-2.2 3.2-3.3L17 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GospelPassage({
  verses,
  book,
  citation,
  date,
  edition,
}: {
  verses: GospelVerse[];
  book: GospelBook | null;
  citation: string;
  date: string;
  edition: GospelEdition;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const versesRef = useRef(verses);
  const metaRef = useRef({ book, citation, date, edition });
  versesRef.current = verses;
  metaRef.current = { book, citation, date, edition };

  const navigate = useNavigate();
  const [float, setFloat] = useState<FloatState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  function readSelection(): FloatState | null {
    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    if (!root.contains(ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentNode)) {
      return null;
    }
    const selected = normalizeQuoteText(selection.toString());
    if (!selected) return null;

    const currentVerses = versesRef.current;
    const nodes = overlappingVerseNodes(root, range);
    const hits = nodes
      .map((node) => Number(node.dataset.verseIndex))
      .filter((index) => Number.isInteger(index));
    if (!hits.length) return null;
    const from = Math.min(...hits);
    const to = Math.max(...hits);
    const covered = currentVerses.slice(from, to + 1);
    if (!covered.length) return null;

    const numbered = covered.filter((verse) => verse.number > 0);
    const verseCount = new Set(
      (numbered.length ? numbered : covered).map((verse) => `${verse.chapter}:${verse.number}`),
    ).size;

    const { book: currentBook, citation: currentCitation, date: currentDate, edition: currentEdition } =
      metaRef.current;
    const verseBody = normalizeQuoteText(covered.map((verse) => verse.text).join(" "));
    const reference = formatUsfmSlugFromCita(currentBook, covered, currentCitation);
    const rects = range.getClientRects();
    const last = rects[rects.length - 1] ?? range.getBoundingClientRect();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const base = {
      date: currentDate,
      edition: currentEdition,
      book: currentBook ?? "",
      reference,
      verseStart: covered[0]?.number ?? 0,
      verseEnd: covered[covered.length - 1]?.number ?? 0,
      chapterStart: covered[0]?.chapter ?? 0,
      chapterEnd: covered[covered.length - 1]?.chapter ?? 0,
    };
    return {
      top: last.bottom + (coarse ? 28 : 8),
      left: last.right,
      verseCount,
      exact: selected === verseBody,
      payloadVerse: { ...base, mode: "verse" as const, body: verseBody },
      payloadSelection: { ...base, mode: "selection" as const, body: selected },
    };
  }

  useEffect(() => {
    let raf = 0;
    let pointers = 0;
    let pendingExpand = false;
    function apply(next: FloatState | null) {
      setFloat((prev) => {
        if (!prev && !next) return prev;
        if (
          prev &&
          next &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.verseCount === next.verseCount &&
          prev.exact === next.exact &&
          prev.payloadVerse.body === next.payloadVerse.body &&
          prev.payloadSelection.body === next.payloadSelection.body &&
          prev.payloadVerse.reference === next.payloadVerse.reference
        ) {
          return prev;
        }
        return next;
      });
    }
    function sync() {
      raf = 0;
      const expand = pendingExpand;
      pendingExpand = false;
      try {
        if (expand && pointers === 0 && rootRef.current) {
          expandGospelSelectionIfNeeded(rootRef.current);
        }
        apply(readSelection());
      } catch {
        apply(null);
      }
    }
    function schedule(expand = false) {
      if (expand) pendingExpand = true;
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    }
    function onSelectionChange() {
      schedule(pointers === 0);
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (barRef.current?.contains(target)) return;
      pointers += 1;
      if (!rootRef.current?.contains(target) && !window.getSelection()?.toString()) {
        apply(null);
      }
    }
    function onPointerUp() {
      pointers = Math.max(0, pointers - 1);
      schedule(true);
    }
    function onMove() {
      schedule(false);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onPointerUp);
    window.addEventListener("scroll", onMove, true);
    window.visualViewport?.addEventListener("scroll", onMove);
    window.visualViewport?.addEventListener("resize", onMove);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("scroll", onMove, true);
      window.visualViewport?.removeEventListener("scroll", onMove);
      window.visualViewport?.removeEventListener("resize", onMove);
    };
  }, []);

  async function save(payload: QuoteInput) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await addQuote({ data: payload });
      setSavedFlash(result?.created === false ? "Ya estaba guardada" : "Cita guardada");
      setFloat(null);
      window.getSelection()?.removeAllRanges();
      window.setTimeout(() => setSavedFlash(null), 1600);
    } catch (error) {
      if (isUnauthorized(error)) {
        goToSignIn(payload, navigate);
      } else {
        setSavedFlash("No se pudo guardar");
        window.setTimeout(() => setSavedFlash(null), 2000);
        console.error("[quotes] save failed", error);
      }
    } finally {
      setSaving(false);
    }
  }

  const barWidth = 240;
  const placed = float
    ? {
        top: Math.min(Math.max(8, float.top), window.innerHeight - (float.exact ? 64 : 120)),
        left: Math.min(Math.max(8, float.left - 12), window.innerWidth - barWidth - 8),
      }
    : null;

  return (
    <>
      <Suspense fallback={null}>
        <PendingQuoteFlush
          date={date}
          onSaved={(created) => {
            setSavedFlash(created ? "Cita guardada" : "Ya estaba guardada");
            window.setTimeout(() => setSavedFlash(null), 1600);
          }}
        />
      </Suspense>
      <div
        ref={rootRef}
        className="mt-8 font-display text-lg leading-8 text-fg sm:text-xl sm:leading-9"
      >
        {verses.map((verse, i) => (
          <span key={`${verse.chapter}-${verse.number}-${i}`}>
            {verse.number > 0 ? (
              <sup className="mr-1 select-none font-sans text-xs font-medium text-subtle">
                {verse.number}
              </sup>
            ) : null}
            <span data-verse-index={i} data-verse-text="">
              {verse.text}
            </span>
            {i < verses.length - 1 ? " " : ""}
          </span>
        ))}
      </div>

      {placed && float && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={barRef}
              className="fixed z-[60] flex flex-col gap-2"
              style={{ top: placed.top, left: placed.left }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                disabled={saving}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void save(float.payloadVerse);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-sans text-sm font-medium text-primary-fg shadow-card transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
              >
                <QuoteSaveIcon className="size-4 shrink-0" />
                Guardar Cita
              </button>
            </div>,
            document.body,
          )
        : null}

      {savedFlash
        ? createPortal(
            <p className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-primary px-4 py-2 font-sans text-sm text-primary-fg shadow-card">
              {savedFlash}
            </p>,
            document.body,
          )
        : null}
    </>
  );
}
