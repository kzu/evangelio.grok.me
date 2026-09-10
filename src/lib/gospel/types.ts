export type GospelBook = "mt" | "mc" | "lc" | "jn";

export type GospelEdition = "adult" | "family";

export type VerseRange = {
  chapter: number;
  start: number;
  end: number;
};

export type GospelVerse = {
  chapter: number;
  number: number;
  text: string;
};

export type Thought = {
  quote: string;
  source: string;
};

export type LatinoCopy = {
  commentTitle: string;
  commentary: string[];
  thoughts: Thought[];
  gospelText: string;
};

export type DailyGospel = {
  date: string;
  displayDate: string;
  liturgicalDay: string;
  liturgicalColor: LiturgicalColor;
  prevDate: string | null;
  nextDate: string | null;
  citation: string;
  book: GospelBook | null;
  bookName: string;
  verses: GospelVerse[];
  gospelHtmlFallback: string;
  source: "vatican" | "evangeli" | "family";
  edition: GospelEdition;
  vaticanUrl: string | null;
  commentTitle: string;
  authorName: string;
  authorOrigin: string;
  commentary: string[];
  thoughts: Thought[];
  evangeliUrl: string;
  adaptedLatino: boolean;
  loadError?: string;
};

export type LiturgicalColor =
  | "green"
  | "white"
  | "red"
  | "violet"
  | "rose"
  | "black"
  | "unknown";
