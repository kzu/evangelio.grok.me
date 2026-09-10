import type { GospelBook } from "./types";

/** IntraText chapter codes for El Libro del Pueblo de Dios (Vatican ESL0506). */
const CHAPTER_CODES: Record<GospelBook, string[]> = {
  mt: "PUB PUC PUD PUE PUF PUG PUH PUI PUJ PUK PUL PUM PUN PUO PUP PUQ PUR PUS PUT PUU PUV PUW PUX PUY PUZ PV0 PV1 PV2".split(
    " ",
  ),
  mc: "PV3 PV4 PV5 PV6 PV7 PV8 PV9 PVA PVB PVC PVD PVE PVF PVG PVH PVI".split(" "),
  lc: "PVJ PVK PVL PVM PVN PVO PVP PVQ PVR PVS PVT PVU PVV PVW PVX PVY PVZ PW0 PW1 PW2 PW3 PW4 PW5 PW6".split(
    " ",
  ),
  jn: "PW7 PW8 PW9 PWA PWB PWC PWD PWE PWF PWG PWH PWI PWJ PWK PWL PWM PWN PWO PWP PWQ PWR".split(
    " ",
  ),
};

export function vaticanChapterUrl(book: GospelBook, chapter: number): string | null {
  const code = CHAPTER_CODES[book][chapter - 1];
  if (!code) return null;
  return `https://www.vatican.va/archive/ESL0506/__${code}.HTM`;
}
