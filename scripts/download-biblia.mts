/**
 * Download El Libro del Pueblo de Dios (Vatican ESL0506) into public/biblia.
 * One USFM-coded JSON file per book: array of chapters, each an array of verses.
 *
 * `public/biblia` is gitignored and omitted from the deploy. Runtime loads
 * `https://evangelio.groked.cc/biblia/JHN.json` (same CDN as cita thumbs).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "biblia");
const INDEX_URL = "https://www.vatican.va/archive/ESL0506/_INDEX.HTM";
const BASE = "https://www.vatican.va/archive/ESL0506/";
const CONCURRENCY = 4;
const DELAY_MS = 80;
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

type Testament = "AT" | "NT";

type BookMeta = {
  id: string;
  name: string;
  testament: Testament;
};

type ChapterJob = {
  usfm: string;
  name: string;
  testament: Testament;
  chapter: number;
  url: string;
};

const BOOK_BY_INDEX: Record<string, BookMeta> = {
  GENESIS: { id: "GEN", name: "Génesis", testament: "AT" },
  EXODO: { id: "EXO", name: "Éxodo", testament: "AT" },
  LEVITICO: { id: "LEV", name: "Levítico", testament: "AT" },
  NUMEROS: { id: "NUM", name: "Números", testament: "AT" },
  DEUTERONOMIO: { id: "DEU", name: "Deuteronomio", testament: "AT" },
  JOSUE: { id: "JOS", name: "Josué", testament: "AT" },
  JUECES: { id: "JDG", name: "Jueces", testament: "AT" },
  "PRIMER LIBRO DE SAMUEL": { id: "1SA", name: "1 Samuel", testament: "AT" },
  "SEGUNDO LIBRO DE SAMUEL": { id: "2SA", name: "2 Samuel", testament: "AT" },
  "PRIMER LIBRO DE LOS REYES": { id: "1KI", name: "1 Reyes", testament: "AT" },
  "SEGUNDO LIBRO DE LOS REYES": { id: "2KI", name: "2 Reyes", testament: "AT" },
  ISAIAS: { id: "ISA", name: "Isaías", testament: "AT" },
  JEREMIAS: { id: "JER", name: "Jeremías", testament: "AT" },
  EZEQUIEL: { id: "EZE", name: "Ezequiel", testament: "AT" },
  OSEAS: { id: "HOS", name: "Oseas", testament: "AT" },
  JOEL: { id: "JOL", name: "Joel", testament: "AT" },
  AMOS: { id: "AMO", name: "Amós", testament: "AT" },
  ABDIAS: { id: "OBA", name: "Abdías", testament: "AT" },
  JONAS: { id: "JON", name: "Jonás", testament: "AT" },
  MIQUEAS: { id: "MIC", name: "Miqueas", testament: "AT" },
  NAHUM: { id: "NAM", name: "Nahúm", testament: "AT" },
  HABACUC: { id: "HAB", name: "Habacuc", testament: "AT" },
  SOFONIAS: { id: "ZEP", name: "Sofonías", testament: "AT" },
  AGEO: { id: "HAG", name: "Ageo", testament: "AT" },
  ZACARIAS: { id: "ZEC", name: "Zacarías", testament: "AT" },
  MALAQUIAS: { id: "MAL", name: "Malaquías", testament: "AT" },
  SALMOS: { id: "PSA", name: "Salmos", testament: "AT" },
  JOB: { id: "JOB", name: "Job", testament: "AT" },
  PROVERBIOS: { id: "PRO", name: "Proverbios", testament: "AT" },
  RUT: { id: "RUT", name: "Rut", testament: "AT" },
  "CANTAR DE LOS CANTARES": { id: "SNG", name: "Cantar de los Cantares", testament: "AT" },
  ECLESIASTES: { id: "ECC", name: "Eclesiastés", testament: "AT" },
  LAMENTACIONES: { id: "LAM", name: "Lamentaciones", testament: "AT" },
  ESTER: { id: "EST", name: "Ester", testament: "AT" },
  DANIEL: { id: "DAN", name: "Daniel", testament: "AT" },
  "PRIMER LIBRO DE LAS CRONICAS": { id: "1CH", name: "1 Crónicas", testament: "AT" },
  "SEGUNDO LIBRO DE LAS CRONICAS": { id: "2CH", name: "2 Crónicas", testament: "AT" },
  ESDRAS: { id: "EZR", name: "Esdras", testament: "AT" },
  NEHEMIAS: { id: "NEH", name: "Nehemías", testament: "AT" },
  "ESTER SUPLEMENTOS GRIEGOS": { id: "ESG", name: "Ester (suplementos griegos)", testament: "AT" },
  JUDIT: { id: "JDT", name: "Judit", testament: "AT" },
  TOBIAS: { id: "TOB", name: "Tobías", testament: "AT" },
  "PRIMER LIBRO DE LOS MACABEOS": { id: "1MA", name: "1 Macabeos", testament: "AT" },
  "SEGUNDO LIBRO DE LOS MACABEOS": { id: "2MA", name: "2 Macabeos", testament: "AT" },
  SABIDURIA: { id: "WIS", name: "Sabiduría", testament: "AT" },
  ECLESIASTICO: { id: "SIR", name: "Eclesiástico", testament: "AT" },
  BARUC: { id: "BAR", name: "Baruc", testament: "AT" },
  "CARTA DE JEREMIAS": { id: "LJE", name: "Carta de Jeremías", testament: "AT" },
  "DANIEL SUPLEMENTOS GRIEGOS": { id: "DAG", name: "Daniel (suplementos griegos)", testament: "AT" },
  "EVANGELIO SEGUN SAN MATEO": { id: "MAT", name: "Mateo", testament: "NT" },
  "EVANGELIO SEGUN SAN MARCOS": { id: "MRK", name: "Marcos", testament: "NT" },
  "EVANGELIO SEGUN SAN LUCAS": { id: "LUK", name: "Lucas", testament: "NT" },
  "EVANGELIO SEGUN SAN JUAN": { id: "JHN", name: "Juan", testament: "NT" },
  "HECHOS DE LOS APOSTOLES": { id: "ACT", name: "Hechos", testament: "NT" },
  "CARTA A LOS ROMANOS": { id: "ROM", name: "Romanos", testament: "NT" },
  "PRIMERA CARTA A LOS CORINTIOS": { id: "1CO", name: "1 Corintios", testament: "NT" },
  "SEGUNDA CARTA A LOS CORINTIOS": { id: "2CO", name: "2 Corintios", testament: "NT" },
  "CARTA A LOS GALATAS": { id: "GAL", name: "Gálatas", testament: "NT" },
  "CARTA A LOS EFESIOS": { id: "EPH", name: "Efesios", testament: "NT" },
  "CARTA A LOS FILIPENSES": { id: "PHP", name: "Filipenses", testament: "NT" },
  "CARTA A LOS COLOSENSES": { id: "COL", name: "Colosenses", testament: "NT" },
  "PRIMERA CARTA A LOS TESALONICENSES": { id: "1TH", name: "1 Tesalonicenses", testament: "NT" },
  "SEGUNDA CARTA A LOS TESALONICENSES": { id: "2TH", name: "2 Tesalonicenses", testament: "NT" },
  "PRIMERA CARTA A TIMOTEO": { id: "1TI", name: "1 Timoteo", testament: "NT" },
  "SEGUNDA CARTA A TIMOTEO": { id: "2TI", name: "2 Timoteo", testament: "NT" },
  "CARTA A TITO": { id: "TIT", name: "Tito", testament: "NT" },
  "CARTA A FILEMON": { id: "PHM", name: "Filemón", testament: "NT" },
  "CARTA A LOS HEBREOS": { id: "HEB", name: "Hebreos", testament: "NT" },
  "CARTA DE SANTIAGO": { id: "JAS", name: "Santiago", testament: "NT" },
  "PRIMERA CARTA DE SAN PEDRO": { id: "1PE", name: "1 Pedro", testament: "NT" },
  "SEGUNDA CARTA DE SAN PEDRO": { id: "2PE", name: "2 Pedro", testament: "NT" },
  "PRIMERA CARTA DE SAN JUAN": { id: "1JN", name: "1 Juan", testament: "NT" },
  "SEGUNDA CARTA DE SAN JUAN": { id: "2JN", name: "2 Juan", testament: "NT" },
  "TERCERA CARTA DE SAN JUAN": { id: "3JN", name: "3 Juan", testament: "NT" },
  "CARTA DE SAN JUDAS": { id: "JUD", name: "Judas", testament: "NT" },
  APOCALIPSIS: { id: "REV", name: "Apocalipsis", testament: "NT" },
};

const DAG_SPLIT: Record<number, BookMeta> = {
  3: { id: "S3Y", name: "Cántico de los tres jóvenes", testament: "AT" },
  13: { id: "SUS", name: "Susana", testament: "AT" },
  14: { id: "BEL", name: "Bel y el dragón", testament: "AT" },
};

/** Expected chapter-array length (max chapter number). Sparse books keep empty slots. */
const EXPECTED_CHAPTERS: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4,
  "1SA": 31, "2SA": 24, "1KI": 22, "2KI": 25, "1CH": 29, "2CH": 36, EZR: 10, NEH: 13,
  EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8, ISA: 66, JER: 52, LAM: 5,
  EZE: 48, DAN: 12, HOS: 14, JOL: 4, AMO: 9, OBA: 1, JON: 4, MIC: 7, NAM: 3,
  HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 3, TOB: 14, JDT: 16, ESG: 10, WIS: 19,
  SIR: 51, BAR: 5, LJE: 1, S3Y: 1, SUS: 1, BEL: 1, "1MA": 16, "2MA": 15,
  MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, "1CO": 16, "2CO": 13,
  GAL: 6, EPH: 6, PHP: 4, COL: 4, "1TH": 5, "2TH": 3, "1TI": 6, "2TI": 4,
  TIT: 3, PHM: 1, HEB: 13, JAS: 5, "1PE": 5, "2PE": 3, "1JN": 5, "2JN": 1,
  "3JN": 1, JUD: 1, REV: 22,
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLatin1(url: string, attempts = 5): Promise<string> {
  let last: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`${url} → ${res.status}`);
      }
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return Buffer.from(await res.arrayBuffer()).toString("latin1");
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      await sleep(400 * 2 ** i);
    }
  }
  throw last ?? new Error(url);
}

function chapterUrl(href: string) {
  const file = href.replace(/^\.\//, "").split("#")[0];
  if (!/^__[A-Z0-9]+\.HTM$/i.test(file)) {
    throw new Error(`unexpected chapter href: ${href}`);
  }
  return BASE + file;
}

function parseIndex(html: string): ChapterJob[] {
  const $ = load(html);
  const jobs: ChapterJob[] = [];
  const root = $("ul").first();
  if (!root.length) throw new Error("no index list");

  root.children("li").each((_, testamentLi) => {
    const testamentLabel = fold($(testamentLi).children("font").first().text());
    const testament: Testament = testamentLabel.includes("NUEVO") ? "NT" : "AT";
    const booksUl = $(testamentLi).children("ul").first();
    booksUl.children("li").each((_, bookLi) => {
      const $book = $(bookLi);
      const bookFont = $book.children("font").first();
      const rawName = collapseWhitespace(bookFont.text());
      const key = fold(rawName);
      const meta = BOOK_BY_INDEX[key];
      if (!meta) throw new Error(`unknown book in index: ${rawName}`);

      const nested = $book.children("ul").first();
      const chapters: { n: number; href: string }[] = [];
      if (nested.length) {
        nested.find("a").each((__, a) => {
          const n = Number(collapseWhitespace($(a).text()));
          const href = $(a).attr("href") ?? "";
          if (!Number.isInteger(n) || n < 1 || !href) return;
          chapters.push({ n, href });
        });
      } else {
        const href = bookFont.find("a").attr("href") ?? "";
        if (!href) throw new Error(`no chapter links for ${rawName}`);
        chapters.push({ n: 1, href });
      }
      if (!chapters.length) throw new Error(`empty chapter list for ${rawName}`);

      if (meta.id === "DAG") {
        for (const ch of chapters) {
          const split = DAG_SPLIT[ch.n];
          if (!split) throw new Error(`unexpected Daniel Greek chapter ${ch.n}`);
          jobs.push({
            usfm: split.id,
            name: split.name,
            testament: split.testament,
            chapter: 1,
            url: chapterUrl(ch.href),
          });
        }
        return;
      }

      for (const ch of chapters) {
        jobs.push({
          usfm: meta.id,
          name: meta.name,
          testament,
          chapter: ch.n,
          url: chapterUrl(ch.href),
        });
      }
    });
  });

  return jobs;
}

function parseChapter(html: string, label: string): string[] {
  const $ = load(html);
  const parts = new Map<number, string[]>();

  $("p.MsoNormal").each((_, el) => {
    const $el = $(el).clone();
    $el.find("sup, a[href*='_NOTE']").remove();
    const raw = collapseWhitespace($el.text());
    if (!raw) return;
    const match =
      raw.match(/^(\d+)([a-z])\s+(.*)$/i) ??
      raw.match(/^(\d+)\s+([a-z])\s+(.*)$/i) ??
      raw.match(/^(\d+)\s+(.*)$/);
    if (!match) return;
    const number = Number(match[1]);
    let text = (match.length === 4 ? match[3] : match[2]) ?? "";
    text = text.replace(/^a\s+(?=[A-ZÁÉÍÓÚÑ])/u, "").trim();
    text = text.replace(/\s+([.,;:!?»”])/g, "$1");
    if (!text || !Number.isInteger(number) || number < 1) return;
    const list = parts.get(number) ?? [];
    list.push(text);
    parts.set(number, list);
  });

  if (!parts.size) throw new Error(`no verses in ${label}`);
  const max = Math.max(...parts.keys());
  const verses: string[] = [];
  for (let n = 1; n <= max; n++) {
    const chunks = parts.get(n);
    verses.push(chunks ? chunks.join(" ") : "");
  }
  return verses;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function assembleBooks(jobs: ChapterJob[], verses: string[][]) {
  const order: string[] = [];
  const meta = new Map<string, { name: string; testament: Testament }>();
  const chapters = new Map<string, Map<number, string[]>>();

  jobs.forEach((job, i) => {
    if (!meta.has(job.usfm)) {
      order.push(job.usfm);
      meta.set(job.usfm, { name: job.name, testament: job.testament });
      chapters.set(job.usfm, new Map());
    }
    chapters.get(job.usfm)!.set(job.chapter, verses[i] ?? []);
  });

  const files = new Map<string, string[][]>();
  for (const id of order) {
    const byChapter = chapters.get(id)!;
    const max = Math.max(...byChapter.keys());
    const arr: string[][] = [];
    for (let n = 1; n <= max; n++) {
      arr.push(byChapter.get(n) ?? []);
    }
    files.set(id, arr);
  }
  return { order, meta, files };
}

function validate(order: string[], files: Map<string, string[][]>) {
  const errors: string[] = [];
  const gaps: string[] = [];
  for (const [id, expected] of Object.entries(EXPECTED_CHAPTERS)) {
    const book = files.get(id);
    if (!book) {
      errors.push(`missing ${id}`);
      continue;
    }
    if (book.length !== expected) {
      errors.push(`${id} chapters ${book.length} ≠ ${expected}`);
    }
  }
  for (const id of order) {
    if (!(id in EXPECTED_CHAPTERS)) errors.push(`unexpected extra ${id}`);
    const book = files.get(id) ?? [];
    book.forEach((ch, ci) => {
      if (ch.length === 0) return;
      ch.forEach((v, vi) => {
        if (!v) gaps.push(`${id} ${ci + 1}:${vi + 1}`);
      });
    });
  }

  const gen11 = files.get("GEN")?.[0]?.[0] ?? "";
  const jhn11 = files.get("JHN")?.[0]?.[0] ?? "";
  if (!/Al principio Dios cre/.test(gen11)) {
    errors.push(`GEN 1:1 unexpected: ${gen11.slice(0, 80)}`);
  }
  if (!/Al principio exist/.test(jhn11)) {
    errors.push(`JHN 1:1 unexpected: ${jhn11.slice(0, 80)}`);
  }

  return { errors, gaps };
}

const html = await fetchLatin1(INDEX_URL);
const jobs = parseIndex(html);
console.log(`index: ${jobs.length} chapters, ${new Set(jobs.map((j) => j.usfm)).size} books`);

if (DRY_RUN) {
  const counts = new Map<string, number>();
  for (const job of jobs) counts.set(job.usfm, Math.max(counts.get(job.usfm) ?? 0, job.chapter));
  for (const [id, n] of counts) {
    const expected = EXPECTED_CHAPTERS[id];
    const mark = expected === n ? "ok" : `expected ${expected}`;
    console.log(`  ${id}  maxCh=${n}  ${mark}`);
  }
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const verses: string[][] = new Array(jobs.length);
const byBook = new Map<string, { job: ChapterJob; index: number }[]>();
for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i]!;
  const list = byBook.get(job.usfm) ?? [];
  list.push({ job, index: i });
  byBook.set(job.usfm, list);
}

for (const [id, chapters] of byBook) {
  const path = join(OUT_DIR, `${id}.json`);
  if (!FORCE && existsSync(path)) {
    const cached = JSON.parse(readFileSync(path, "utf8")) as string[][];
    for (const { job, index } of chapters) {
      verses[index] = cached[job.chapter - 1] ?? [];
    }
    console.log(`skip ${id} (${cached.length} ch, cached)`);
    continue;
  }
  await mapPool(chapters, CONCURRENCY, async ({ job, index }) => {
    await sleep(DELAY_MS);
    const page = await fetchLatin1(job.url);
    const parsed = parseChapter(page, `${job.usfm} ${job.chapter}`);
    verses[index] = parsed;
    return parsed;
  });
  const max = Math.max(...chapters.map((c) => c.job.chapter));
  const book: string[][] = [];
  const byChapter = new Map(chapters.map((c) => [c.job.chapter, verses[c.index]!]));
  for (let n = 1; n <= max; n++) book.push(byChapter.get(n) ?? []);
  writeFileSync(path, `${JSON.stringify(book)}\n`);
  const vcount = book.reduce((n, ch) => n + ch.filter(Boolean).length, 0);
  console.log(`wrote ${id} (${book.length} ch, ${vcount} v)`);
}

const { order, meta, files } = assembleBooks(jobs, verses);
const { errors, gaps } = validate(order, files);

const catalog = order.map((id) => {
  const book = files.get(id)!;
  const filled = book.filter((ch) => ch.length > 0).length;
  const verseCount = book.reduce((n, ch) => n + ch.filter(Boolean).length, 0);
  const info = meta.get(id)!;
  return {
    id,
    name: info.name,
    testament: info.testament,
    chapters: book.length,
    filledChapters: filled,
    verses: verseCount,
  };
});
writeFileSync(join(OUT_DIR, "books.json"), `${JSON.stringify(catalog, null, 2)}\n`);

const verseTotal = catalog.reduce((n, b) => n + b.verses, 0);
console.log(`wrote ${order.length} books, ${jobs.length} chapter pages, ${verseTotal} verses → ${OUT_DIR}`);
if (gaps.length) {
  console.warn(`verse gaps (${gaps.length}): ${gaps.slice(0, 30).join("; ")}${gaps.length > 30 ? "…" : ""}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("validation ok");
