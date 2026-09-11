import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string[][]>();

function parseBook(raw: string): string[][] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as string[][]) : null;
  } catch {
    return null;
  }
}

function publicOrigin(): string {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "evangelio.grok.me";
  return /^https?:\/\//i.test(host) ? host.replace(/\/$/, "") : `https://${host}`;
}

/** One book of *El Libro del Pueblo de Dios* (USFM id → chapters → verses). */
export async function loadBibliaBook(usfm: string): Promise<string[][] | null> {
  const id = usfm.trim().toUpperCase();
  if (!id) return null;
  const hit = cache.get(id);
  if (hit) return hit;

  const disk = join(process.cwd(), "public", "biblia", `${id}.json`);
  if (existsSync(disk)) {
    const data = parseBook(readFileSync(disk, "utf8"));
    if (data) {
      cache.set(id, data);
      return data;
    }
  }

  try {
    const res = await fetch(`${publicOrigin()}/biblia/${id}.json`);
    if (!res.ok) return null;
    const data = parseBook(await res.text());
    if (!data) return null;
    cache.set(id, data);
    return data;
  } catch {
    return null;
  }
}
