/** Shared PWA install detection — Edge Android never fires beforeinstallprompt reliably. */

export const PWA_SHOW_EVENT = "pwa-show-install";

const DISMISS_KEY = "evangelio.pwa.installDismissed.v1";
const SEEN_MODAL_KEY = "evangelio.pwa.installModalSeen.v1";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  for (const mode of [
    "standalone",
    "minimal-ui",
    "window-controls-overlay",
    "fullscreen",
  ] as const) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) return true;
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|EdgA/i;
const IOS_IN_APP = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|GSA\/|Snapchat|TikTok|MicroMessenger/i;

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** iPad, including desktop-class iPadOS that reports as Mac. */
export function isIpad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && !/iPhone/.test(ua);
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /WebKit/.test(ua) && !IOS_OTHER_BROWSER.test(ua) && !IOS_IN_APP.test(ua);
}

export function isEdgeAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent) && /EdgA/i.test(navigator.userAgent);
}

/** Phone/tablet — UA first so Edge “Desktop site” still counts. */
export function isPhoneLike(): boolean {
  if (typeof window === "undefined") return false;
  if (isAndroidUa() || /iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

export function readDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at) || Date.now() - at > DISMISS_MS) {
      window.localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function readModalSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_MODAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeModalSeen(): void {
  try {
    window.localStorage.setItem(SEEN_MODAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function requestShowInstall(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PWA_SHOW_EVENT));
}
