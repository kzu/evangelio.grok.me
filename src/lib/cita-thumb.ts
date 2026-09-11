import { bookToUsfm, isUsfmId } from "./biblia/usfm.ts";

const THUMB_PNG = /^\/(?:citas|biblia)\/([A-Za-z][A-Za-z0-9]*)\.(\d+)\.(\d+)\.png$/i;

/** Map `/citas/Mt.5.3.png` (or legacy `/biblia/…`) onto `/citas/MAT/5.3.png`. */
export function mapCitaThumbPath(pathname: string): string | null {
  const match = THUMB_PNG.exec(pathname);
  if (!match) return null;
  const usfm = bookToUsfm(match[1] ?? "");
  if (!usfm || !isUsfmId(usfm)) return null;
  const chapter = Number(match[2]);
  const verse = Number(match[3]);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
    return null;
  }
  return `/citas/${usfm}/${chapter}.${verse}.png`;
}
