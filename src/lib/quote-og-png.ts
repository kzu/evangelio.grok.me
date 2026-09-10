import { createRequire } from "node:module";
import { crc32, deflateSync } from "node:zlib";
import { LIBRE_BASKERVILLE_ITALIC_B64 } from "./fonts/libre-baskerville-italic.ts";

type OpenTypeFont = import("opentype.js").Font;
type OpenTypePath = import("opentype.js").Path;

const parseFont = createRequire(import.meta.url)("opentype.js").parse as (
  buf: ArrayBuffer,
) => OpenTypeFont;

const W = 1200;
const H = 630;

type Color = readonly [number, number, number];
type Point = [number, number];
export type QuoteOgTheme = "dark" | "light";

const THEMES: Record<QuoteOgTheme, { bg: Color; accent: Color; text: Color }> = {
  dark: {
    bg: [0x14, 0x11, 0x0e],
    accent: [0xc9, 0xb8, 0x96],
    text: [0xfa, 0xf6, 0xee],
  },
  light: {
    bg: [0xf4, 0xea, 0xd6],
    accent: [0x6e, 0x4b, 0x2e],
    text: [0x2a, 0x1c, 0x12],
  },
};

let fontCache: OpenTypeFont | null = null;

function quoteFont(): OpenTypeFont {
  if (fontCache) return fontCache;
  const bytes = Buffer.from(LIBRE_BASKERVILLE_ITALIC_B64, "base64");
  fontCache = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return fontCache;
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return [
    uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
    uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1],
  ];
}

function quad(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

function flattenPath(path: OpenTypePath): Point[][] {
  const polys: Point[][] = [];
  let current: Point[] = [];
  let x = 0;
  let y = 0;
  let mx = 0;
  let my = 0;
  for (const c of path.commands) {
    if (c.type === "M") {
      if (current.length > 1) polys.push(current);
      x = mx = c.x;
      y = my = c.y;
      current = [[x, y]];
    } else if (c.type === "L") {
      current.push([c.x, c.y]);
      x = c.x;
      y = c.y;
    } else if (c.type === "C") {
      const p0: Point = [x, y];
      const p1: Point = [c.x1, c.y1];
      const p2: Point = [c.x2, c.y2];
      const p3: Point = [c.x, c.y];
      for (let i = 1; i <= 8; i++) current.push(cubic(p0, p1, p2, p3, i / 8));
      x = c.x;
      y = c.y;
    } else if (c.type === "Q") {
      const p0: Point = [x, y];
      const p1: Point = [c.x1, c.y1];
      const p2: Point = [c.x, c.y];
      for (let i = 1; i <= 8; i++) current.push(quad(p0, p1, p2, i / 8));
      x = c.x;
      y = c.y;
    } else if (c.type === "Z") {
      current.push([mx, my]);
      if (current.length > 2) polys.push(current);
      current = [];
      x = mx;
      y = my;
    }
  }
  if (current.length > 1) polys.push(current);
  return polys;
}

class Canvas {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 3);
  }
  fill(color: Color) {
    const p = this.pixels;
    for (let i = 0; i < p.length; i += 3) {
      p[i] = color[0];
      p[i + 1] = color[1];
      p[i + 2] = color[2];
    }
  }
  rect(x: number, y: number, w: number, h: number, color: Color) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.width, (x + w) | 0);
    const y1 = Math.min(this.height, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * this.width + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.pixels[i] = color[0];
        this.pixels[i + 1] = color[1];
        this.pixels[i + 2] = color[2];
        i += 3;
      }
    }
  }
  fillPolys(polys: Point[][], color: Color) {
    if (!polys.length) return;
    let minY = this.height;
    let maxY = 0;
    for (const poly of polys) {
      for (const [, py] of poly) {
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.height - 1, Math.ceil(maxY));
    const xs: number[] = [];
    for (let y = y0; y <= y1; y++) {
      const scan = y + 0.5;
      xs.length = 0;
      for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i];
          const b = poly[(i + 1) % poly.length];
          const ay = a[1];
          const by = b[1];
          if (ay === by) continue;
          if ((ay <= scan && by > scan) || (by <= scan && ay > scan)) {
            xs.push(a[0] + ((scan - ay) / (by - ay)) * (b[0] - a[0]));
          }
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const left = Math.max(0, Math.ceil(xs[i]));
        const right = Math.min(this.width, Math.floor(xs[i + 1] + 1));
        let idx = (y * this.width + left) * 3;
        for (let x = left; x < right; x++) {
          this.pixels[idx] = color[0];
          this.pixels[idx + 1] = color[1];
          this.pixels[idx + 2] = color[2];
          idx += 3;
        }
      }
    }
  }
  text(value: string, x: number, y: number, size: number, color: Color) {
    if (!value) return;
    const font = quoteFont();
    const path = font.getPath(value, x, y, size);
    this.fillPolys(flattenPath(path), color);
  }
  textRight(value: string, right: number, y: number, size: number, color: Color) {
    if (!value) return;
    const font = quoteFont();
    const width = font.getAdvanceWidth(value, size);
    this.text(value, right - width, y, size, color);
  }
}

function wrapLines(font: OpenTypeFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.getAdvanceWidth(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function ellipsizeLine(font: OpenTypeFont, text: string, size: number, maxWidth: number): string {
  const ellipsis = "…";
  let value = text.replace(/[.,;:\s«]+$/u, "").trim();
  if (font.getAdvanceWidth(`${value}${ellipsis}`, size) <= maxWidth) {
    return `${value}${ellipsis}`;
  }
  const words = value.split(/\s+/);
  while (words.length > 1) {
    words.pop();
    value = words.join(" ");
    if (font.getAdvanceWidth(`${value}${ellipsis}`, size) <= maxWidth) {
      return `${value}${ellipsis}`;
    }
  }
  while (value.length > 1 && font.getAdvanceWidth(`${value}${ellipsis}`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}${ellipsis}`;
}

/** "Lc 6, 27–38" → "Lc 6, 27" */
export function firstVerseReference(reference: string): string {
  return String(reference ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[–—−-]\s*\d+\s*$/u, "");
}

const VERSE_SPLIT = /(?<=[.!?])\s+(?=[¡¿«"“A-ZÁÉÍÓÚÑ])/u;
const SHORT_INTRO = /:\s*$/u;

/** First gospel verse only, even if the saved cita is a range. */
export function firstVerseText(body: string): string {
  const text = String(body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const parts = text.split(VERSE_SPLIT).filter(Boolean);
  if (parts.length <= 1) return text;
  const first = parts[0] ?? text;
  if (first.length < 48 || SHORT_INTRO.test(first)) {
    return [first, parts[1]].filter(Boolean).join(" ");
  }
  return first;
}

function layoutVerse(
  font: OpenTypeFont,
  quote: string,
  maxWidth: number,
  startY: number,
  maxBottom: number,
): { size: number; lineH: number; lines: string[] } {
  let size = 64;
  const min = 48;
  while (size >= min) {
    const lineH = Math.round(size * 1.26);
    const lines = wrapLines(font, quote, size, maxWidth);
    if (startY + lines.length * lineH <= maxBottom) {
      return { size, lineH, lines };
    }
    size -= 2;
  }
  const lineH = Math.round(min * 1.26);
  const lines = wrapLines(font, quote, min, maxWidth);
  const maxLines = Math.max(1, Math.floor((maxBottom - startY) / lineH));
  if (lines.length <= maxLines) return { size: min, lineH, lines };
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsizeLine(font, kept[maxLines - 1] ?? "", min, maxWidth);
  return { size: min, lineH, lines: kept };
}

function encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const dst = y * (width * 3 + 1);
    raw[dst] = 0;
    raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), dst + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, sum]);
}

export function quoteOgPng(input: {
  reference: string;
  body: string;
  theme?: QuoteOgTheme;
}): Buffer {
  const palette = THEMES[input.theme === "light" ? "light" : "dark"];
  const canvas = new Canvas(W, H);
  canvas.fill(palette.bg);
  canvas.rect(0, 0, 14, H, palette.accent);

  const verse = firstVerseText(input.body);
  const reference = firstVerseReference(input.reference);
  const quote = `«${verse}»`;
  const font = quoteFont();
  const startY = 168;
  const { size, lineH, lines } = layoutVerse(font, quote, 1040, startY, H - 110);

  canvas.text("”", 64, 92, 96, palette.accent);
  let y = startY;
  for (const line of lines) {
    canvas.text(line, 72, y, size, palette.text);
    y += lineH;
  }
  canvas.textRight(reference, W - 64, H - 52, 40, palette.accent);
  return encodePng(canvas.pixels, W, H);
}
