/**
 * Upload pregenerated cita thumbnails to the Cloudflare R2 `evangelio` bucket.
 * Keys match the on-disk layout: citas/Mt/5.3.png
 *
 *   node --experimental-strip-types scripts/citas-r2.mts [--yes] [Mt|Jn|…]
 */
import { readdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export const R2_BUCKET = "evangelio";

export type CitaObject = { key: string; file: string };

export function citaThumbRel(book: string, chapter: number, verse: number): string {
  return `citas/${book}/${chapter}.${verse}.png`;
}

export function listCitaPngs(publicDir: string, books?: string[]): CitaObject[] {
  const root = join(publicDir, "citas");
  const wanted = books?.map((value) => value.toLowerCase()) ?? [];
  const out: CitaObject[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (wanted.length && !wanted.includes(entry.name.toLowerCase())) continue;
    const dir = join(root, entry.name);
    for (const name of readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(".png")) continue;
      out.push({
        key: `citas/${entry.name}/${name}`,
        file: join(dir, name),
      });
    }
  }
  return out;
}

export async function confirmUpload(question: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log("(sin terminal interactiva; no se sube a R2 — pasá --upload para forzar)");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return /^(s|si|sí|y|yes)$/i.test(answer);
  } finally {
    rl.close();
  }
}

function runWrangler(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["wrangler", ...args], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler exited ${code ?? "null"}`));
    });
  });
}

export async function uploadCitasToR2(entries: CitaObject[]): Promise<void> {
  if (!entries.length) {
    console.log("R2: nada para subir");
    return;
  }
  const manifest = join(tmpdir(), `citas-r2-${process.pid}.json`);
  writeFileSync(manifest, JSON.stringify(entries));
  console.log(`R2: subiendo ${entries.length} objeto(s) al bucket ${R2_BUCKET}`);
  await runWrangler([
    "r2",
    "bulk",
    "put",
    R2_BUCKET,
    "--filename",
    manifest,
    "--content-type",
    "image/png",
    "--remote",
    "--force",
    "--concurrency",
    "40",
  ]);
}

function parseCli(argv: string[]): { yes: boolean; books: string[] } {
  const books: string[] = [];
  let yes = false;
  for (const arg of argv) {
    if (arg === "--yes" || arg === "--upload" || arg === "-y") yes = true;
    else if (arg.startsWith("-")) {
      throw new Error(`unknown flag: ${arg}`);
    } else books.push(arg);
  }
  return { yes, books };
}

async function main(): Promise<void> {
  const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
  const { yes, books } = parseCli(process.argv.slice(2));
  const entries = listCitaPngs(join(ROOT, "public"), books.length ? books : undefined);
  if (!entries.length) {
    console.log("R2: no hay PNG en public/citas");
    return;
  }
  const ok =
    yes ||
    (await confirmUpload(
      `¿Subir ${entries.length} archivo(s) de public/citas al bucket R2 «${R2_BUCKET}»? [s/N] `,
    ));
  if (!ok) {
    console.log("R2: cancelado");
    return;
  }
  await uploadCitasToR2(entries);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
