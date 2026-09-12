/** Trim + lowercase — Gravatar hashes the normalized address. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function gravatarUrlFromHash(hash: string, size = 88): string {
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

export async function gravatarUrl(email: string, size = 88): Promise<string> {
  return gravatarUrlFromHash(await sha256Hex(normalizeEmail(email)), size);
}
