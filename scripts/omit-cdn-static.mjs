#!/usr/bin/env node
/**
 * Verse OG thumbs and Bible JSON live on the CDN. Vite copies everything under
 * public/, so leftover public/citas or public/biblia (or a previous output)
 * would ship with the deploy. Strip them after the Nitro/Vercel emit.
 * Safe to re-run; missing dirs are ignored.
 */
import { realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CDN_STATIC_DIRS = [
  "dist/citas",
  "dist/biblia",
  ".output/public/citas",
  ".output/public/biblia",
  ".vercel/output/static/citas",
  ".vercel/output/static/biblia",
];

export function omitCdnStatic(root = process.cwd()) {
  for (const rel of CDN_STATIC_DIRS) {
    rmSync(join(root, rel), { recursive: true, force: true });
  }
}

function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  omitCdnStatic();
}
