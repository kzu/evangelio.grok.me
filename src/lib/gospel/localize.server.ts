import type { LatinoCopy, Thought } from "./types";

const translationCache = new Map<string, LatinoCopy>();
const inflight = new Map<string, Promise<LatinoCopy | null>>();

const SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "latino_copy",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["commentTitle", "commentary", "thoughts", "gospelText"],
      properties: {
        commentTitle: { type: "string" },
        commentary: {
          type: "array",
          items: { type: "string" },
        },
        thoughts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["quote", "source"],
            properties: {
              quote: { type: "string" },
              source: { type: "string" },
            },
          },
        },
        gospelText: { type: "string" },
      },
    },
  },
} as const;

export function latinoCacheKey(date: string, edition: "adult" | "family") {
  return `${edition}:${date}`;
}

export function getCachedLatino(date: string, edition: "adult" | "family" = "adult") {
  return translationCache.get(latinoCacheKey(date, edition)) ?? null;
}

export async function adaptToLatinoSpanish(
  date: string,
  input: LatinoCopy,
  edition: "adult" | "family" = "adult",
): Promise<LatinoCopy | null> {
  const key = latinoCacheKey(date, edition);
  const cached = translationCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  if (!input.commentary.length && !input.thoughts.length && !input.gospelText) {
    return null;
  }

  const work = (async () => {
    const adapted = await callGrok(apiKey, input);
    if (adapted) translationCache.set(key, adapted);
    return adapted;
  })();

  inflight.set(key, work);
  try {
    return await work;
  } finally {
    inflight.delete(key);
  }
}

async function callGrok(apiKey: string, input: LatinoCopy): Promise<LatinoCopy | null> {
  const payload = {
    model: "grok-4.5",
    temperature: 0,
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content:
          "Eres un editor de textos católicos. Reescribes al español latinoamericano neutro. " +
          "Reemplaza el voseo peninsular (vosotros, os, vuestro, sois, tenéis, habéis, decís, aparecéis, estáis, etc.) por ustedes y sus conjugaciones. " +
          "Usa un español comprensible en toda América Latina: sin voseo argentino, sin regionalismos fuertes de España (vale, tío, ordenador) ni de un solo país. " +
          "Conserva el sentido teológico, el tono orante, las citas bíblicas con su referencia y los nombres propios. " +
          "No inventes ni omitas ideas, no acortes. Copia el campo source de cada pensamiento sin cambiarlo. " +
          "Mantén el mismo número de párrafos de comentario y de pensamientos. " +
          "El campo gospelText es el texto del Evangelio. Si viene vacío, devuélvelo vacío. " +
          "Si tiene texto, reescríbelo al español latinoamericano neutro sin resumir ni ampliar, conservando las palabras de Jesús.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: SCHEMA,
  };

  const first = await postChat(apiKey, payload);
  if (first) return first;
  return postChat(apiKey, payload);
}

async function postChat(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<LatinoCopy | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[gospel] xAI localize failed", res.status);
      return null;
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content;
    if (!raw) return null;
    return parseLatinoCopy(raw);
  } catch (err) {
    console.warn("[gospel] xAI localize error", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseLatinoCopy(raw: string): LatinoCopy | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LatinoCopy>;
    if (!Array.isArray(parsed.commentary) || !Array.isArray(parsed.thoughts)) {
      return null;
    }
    const commentary = parsed.commentary
      .map((p) => (typeof p === "string" ? p.trim() : ""))
      .filter(Boolean);
    const thoughts: Thought[] = parsed.thoughts
      .map((t) => ({
        quote: typeof t?.quote === "string" ? t.quote.trim() : "",
        source: typeof t?.source === "string" ? t.source.trim() : "",
      }))
      .filter((t) => t.quote.length > 0);
    const gospelText = typeof parsed.gospelText === "string" ? parsed.gospelText.trim() : "";
    if (!commentary.length && !thoughts.length && !gospelText) return null;
    return {
      commentTitle:
        typeof parsed.commentTitle === "string" ? parsed.commentTitle.trim() : "",
      commentary,
      thoughts,
      gospelText,
    };
  } catch {
    return null;
  }
}
