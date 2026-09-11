import { quotePngPath } from "@/lib/quote-ref";

export function dailyGospelUnfurl(gospel: {
  citation: string;
  commentTitle: string;
  verses: { text: string }[];
}) {
  const citation = String(gospel.citation ?? "").trim();
  const title = citation ? `${citation} · Evangelio de Hoy` : "Evangelio de Hoy";
  const quote = String(gospel.commentTitle ?? "").trim();
  const description = quote
    ? /^[«“"]/.test(quote)
      ? quote
      : `«${quote}»`
    : gospel.verses[0]?.text
      ? `«${gospel.verses[0].text}»`
      : "";
  return {
    title,
    description,
    imagePath: quotePngPath(citation) || "/og.jpg",
    documentTitle: quote ? `${quote} · Evangelio de Hoy` : title,
  };
}
