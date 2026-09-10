function xmlEscape(value: string): string {
  const amp = String.fromCharCode(38);
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return `${amp}amp;`;
    if (ch === "<") return `${amp}lt;`;
    if (ch === ">") return `${amp}gt;`;
    if (ch === '"') return `${amp}quot;`;
    return `${amp}apos;`;
  });
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function layoutQuote(text: string): { fontSize: number; lines: string[] } {
  const cleaned = text.replace(/\s+/g, " ").trim();
  for (const fontSize of [40, 34, 28, 24, 20]) {
    const maxChars = Math.max(28, Math.floor(960 / (fontSize * 0.52)));
    const lines = wrapLines(cleaned, maxChars);
    if (lines.length * fontSize * 1.35 <= 340) return { fontSize, lines };
  }
  const fontSize = 20;
  const maxChars = Math.floor(960 / (fontSize * 0.52));
  const lines = wrapLines(cleaned, maxChars);
  const maxLines = 8;
  if (lines.length <= maxLines) return { fontSize, lines };
  const clipped = lines.slice(0, maxLines);
  const last = clipped[clipped.length - 1] ?? "";
  clipped[clipped.length - 1] = `${last.replace(/[.,;:\s]+$/, "")}…`;
  return { fontSize, lines: clipped };
}

export function quoteOgSvg(input: { reference: string; body: string }): string {
  const { fontSize, lines } = layoutQuote(input.body);
  const lineH = fontSize * 1.35;
  const blockH = lines.length * lineH;
  const textY = 210 + (340 - blockH) / 2;
  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineH;
      const prefix = i === 0 ? "«" : "";
      const suffix = i === lines.length - 1 ? "»" : "";
      return `<tspan x="100" dy="${dy}">${xmlEscape(`${prefix}${line}${suffix}`)}</tspan>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#14110e"/>
  <rect x="0" y="48" width="10" height="534" fill="#c9b896"/>
  <text x="100" y="92" fill="#c9b896" font-family="Georgia, 'Palatino Linotype', serif" font-size="72" font-style="italic">”</text>
  <text x="100" y="${textY.toFixed(1)}" fill="#faf6ee" font-family="Georgia, 'Palatino Linotype', Times, serif" font-size="${fontSize}" font-style="italic">${tspans}</text>
  <text x="100" y="560" fill="#c9b896" font-family="'Segoe UI', 'Helvetica Neue', sans-serif" font-size="22" font-weight="600" letter-spacing="3">${xmlEscape(input.reference.toUpperCase())}</text>
  <text x="100" y="594" fill="#9a9184" font-family="'Segoe UI', 'Helvetica Neue', sans-serif" font-size="16" letter-spacing="2">EVANGELIO DE HOY</text>
</svg>`;
}
