import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bundled at build time so Vercel (no public/ on the function FS) still has
 * the corpus. Disk fallback covers `npm run dev` if the glob is empty.
 */
const bundled = import.meta.glob("../../../public/biblia/*.json", {
  eager: true,
  import: "default",
}) as Record<string, string[][]>;

const cache = new Map<string, string[][]>();

for (const [path, data] of Object.entries(bundled)) {
  const match = path.match(/([A-Z0-9]+)\.json$/i);
  if (!match || !Array.isArray(data)) continue;
  cache.set(match[1]!.toUpperCase(), data);
}

export function loadBibliaBook(usfm: string): string[][] | null {
  const id = usfm.trim().toUpperCase();
  if (!id) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const disk = join(process.cwd(), "public", "biblia", `${id}.json`);
  if (!existsSync(disk)) return null;
  try {
    const data = JSON.parse(readFileSync(disk, "utf8")) as string[][];
    if (!Array.isArray(data)) return null;
    cache.set(id, data);
    return data;
  } catch {
    return null;
  }
}
