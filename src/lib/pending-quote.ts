import type { QuoteInput } from "@/lib/quotes";

export const PENDING_QUOTE_KEY = "evangelio.pendingQuote";

export function stashPendingQuote(payload: QuoteInput): void {
  try {
    sessionStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function readPendingQuote(): QuoteInput | null {
  try {
    const raw = sessionStorage.getItem(PENDING_QUOTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteInput;
    if (!parsed?.body || !parsed?.reference || !parsed?.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingQuote(): void {
  try {
    sessionStorage.removeItem(PENDING_QUOTE_KEY);
  } catch {
    /* private mode */
  }
}
