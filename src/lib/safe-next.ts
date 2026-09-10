/** Same-origin relative path only — used after Google sign-in. */
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (value.includes("://")) return fallback;
  return value;
}

export function withFavoritoParam(path: string): string {
  const url = new URL(path, "https://evangelio.local");
  url.searchParams.set("favorito", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function withCitaParam(path: string): string {
  const url = new URL(path, "https://evangelio.local");
  url.searchParams.set("cita", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
