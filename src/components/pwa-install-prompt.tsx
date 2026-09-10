"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PWA_SHOW_EVENT,
  isIosSafari,
  isPhoneLike,
  isStandaloneDisplay,
  readDismissed,
  readModalSeen,
  requestShowInstall,
  writeDismissed,
  writeModalSeen,
} from "@/lib/pwa-install";

const APP_ICON = "/icon-192.png";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * First-run modal + top bar when not running as an installed app.
 * Edge Android often never fires beforeinstallprompt — still show the UI
 * and fall back to menu instructions.
 */
export function PwaInstallPrompt() {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ios] = useState(() => (typeof navigator !== "undefined" ? isIosSafari() : false));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isStandaloneDisplay();
    setInstalled(standalone);

    const dismissedLocal = readDismissed();
    setDismissed(dismissedLocal);
    const modalSeen = readModalSeen();
    const phone = isPhoneLike();

    if (!standalone && phone && !dismissedLocal) {
      setShowBar(true);
      if (!modalSeen) setShowModal(true);
    }

    setReady(true);

    const capture = (e: Event) => {
      if ("preventDefault" in e) e.preventDefault();
      const ev = (e as BeforeInstallPromptEvent).prompt
        ? (e as BeforeInstallPromptEvent)
        : ((window as unknown as { __pwa?: { deferred: BeforeInstallPromptEvent | null } })
            .__pwa?.deferred as BeforeInstallPromptEvent | null);
      if (ev?.prompt) setDeferred(ev);
      if (!isStandaloneDisplay() && isPhoneLike() && !readDismissed()) {
        setShowBar(true);
        if (!readModalSeen()) setShowModal(true);
      }
    };

    const onInstalled = () => {
      setInstalled(true);
      setShowModal(false);
      setShowBar(false);
      setDeferred(null);
    };

    const onForceShow = () => {
      if (isStandaloneDisplay()) return;
      setInstalled(false);
      setDismissed(false);
      setShowBar(true);
      setShowModal(true);
    };

    const early = (
      window as unknown as { __pwa?: { deferred: BeforeInstallPromptEvent | null } }
    ).__pwa?.deferred;
    if (early?.prompt) setDeferred(early);

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("pwa-deferred", capture);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(PWA_SHOW_EVENT, onForceShow);

    const mq = window.matchMedia("(display-mode: standalone)");
    const onMq = () => {
      if (mq.matches) {
        setInstalled(true);
        setShowModal(false);
        setShowBar(false);
      }
    };
    mq.addEventListener?.("change", onMq);

    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("pwa-deferred", capture);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(PWA_SHOW_EVENT, onForceShow);
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  const markModalSeen = useCallback(() => {
    writeModalSeen();
  }, []);

  const dismissAll = useCallback(() => {
    setShowModal(false);
    setShowBar(false);
    setDismissed(true);
    markModalSeen();
    writeDismissed();
  }, [markModalSeen]);

  const closeModalKeepBar = useCallback(() => {
    setShowModal(false);
    markModalSeen();
    if (!dismissed && !installed) setShowBar(true);
  }, [dismissed, installed, markModalSeen]);

  const install = useCallback(async () => {
    if (ios || !deferred?.prompt) {
      setShowModal(true);
      markModalSeen();
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setShowModal(false);
        setShowBar(false);
        setInstalled(true);
      } else {
        closeModalKeepBar();
      }
    } catch {
      closeModalKeepBar();
    } finally {
      setBusy(false);
    }
  }, [closeModalKeepBar, deferred, ios, markModalSeen]);

  if (!ready || installed) return null;
  if (!showModal && !showBar) return null;

  return (
    <>
      {showBar ? (
        <div
          role="region"
          aria-label="Instalar aplicación"
          className={cn(
            "fixed inset-x-0 top-0 z-40 border-b border-border/80",
            "bg-surface/95 text-fg shadow-border backdrop-blur-md",
            "pt-[max(0.5rem,env(safe-area-inset-top))]",
          )}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2 sm:px-8">
            <img
              src={APP_ICON}
              alt=""
              className="size-8 shrink-0 rounded-md"
              width={32}
              height={32}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm font-semibold leading-tight">
                Instalar Evangelio de Hoy
              </p>
              <p className="truncate font-sans text-xs text-muted">
                En la pantalla de inicio, sin el navegador
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 font-sans text-xs font-medium text-primary-fg"
              disabled={busy}
              onClick={() => void install()}
            >
              <Download className="size-3.5" strokeWidth={1.75} />
              Instalar
            </button>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted"
              aria-label="Cerrar aviso de instalación"
              onClick={dismissAll}
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : null}

      {showBar ? (
        <div aria-hidden className="h-[calc(3.25rem+env(safe-area-inset-top,0px))]" />
      ) : null}

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-fg/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-card">
            <div className="flex items-center gap-3 px-4 pt-4">
              <img
                src={APP_ICON}
                alt=""
                className="size-10 shrink-0 rounded-lg"
                width={40}
                height={40}
              />
              <div className="min-w-0 flex-1">
                <h2 id="pwa-install-title" className="font-sans text-base font-semibold tracking-tight">
                  Instalar Evangelio de Hoy
                </h2>
                <p className="font-sans text-xs text-muted">En la pantalla de inicio</p>
              </div>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted"
                aria-label="Cerrar"
                onClick={closeModalKeepBar}
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            {ios || !deferred?.prompt ? (
              <p className="px-4 pt-3 font-sans text-sm leading-6 text-muted">
                {ios ? (
                  <>
                    Tocá{" "}
                    <Share className="inline size-3.5 align-text-bottom" strokeWidth={1.75} />{" "}
                    Compartir y después{" "}
                    <strong className="font-medium text-fg">Agregar a pantalla de inicio</strong>.
                  </>
                ) : (
                  <>
                    En el menú (⋮) elegí{" "}
                    <strong className="font-medium text-fg">Instalar aplicación</strong>.
                  </>
                )}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 px-4 py-4">
              {!ios && deferred?.prompt ? (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 font-sans text-sm font-medium text-primary-fg"
                  onClick={() => void install()}
                >
                  <Download className="size-4" strokeWidth={1.75} />
                  {busy ? "Instalando…" : "Instalar"}
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-3 font-sans text-sm font-medium text-primary-fg"
                  onClick={closeModalKeepBar}
                >
                  Entendido
                </button>
              )}
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-md px-3 font-sans text-sm font-medium text-muted"
                onClick={dismissAll}
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Header control — always available when the site is not a standalone app. */
export function PwaInstallHeaderButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setShow(!isStandaloneDisplay() && isPhoneLike());
    sync();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      mq.removeEventListener?.("change", sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="mr-auto inline-flex size-11 items-center justify-center rounded-md bg-surface text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]"
      aria-label="Instalar aplicación"
      title="Instalar Evangelio de Hoy"
      onClick={() => requestShowInstall()}
    >
      <Download className="size-4" strokeWidth={1.75} />
    </button>
  );
}
