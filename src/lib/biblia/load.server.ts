import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bibliaBookUrl } from "../quote-ref.ts";

const cache = new Map<string, string[][]>();

function parseBook(raw: string): string[][] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as string[][]) : null;
  } catch {
    return null;
  }
}

/** One book of *El Libro del Pueblo de Dios* (USFM id → chapters → verses). */
export async function loadBibliaBook(usfm: string): Promise<string[][] | null> {
  const id = usfm.trim().toUpperCase();
  if (!id) return null;
  const hit = cache.get(id);
  if (hit) return hit;

  try {
    const res = await fetch(bibliaBookUrl(id));
    if (res.ok) {
      const data = parseBook(await res.text());
      if (data) {
        cache.set(id, data);
        return data;
      }
    }
  } catch {
    // fall through to the gitignored local download cache
  }

  const disk = join(process.cwd(), "public", "biblia", `${id}.json`);
  if (existsSync(disk)) {
    const data = parseBook(readFileSync(disk, "utf8"));
    if (data) {
      cache.set(id, data);
      return data;
    }
  }

  return null;
}
