import { createFileRoute } from "@tanstack/react-router";
import { getIndexedVerse, verseRef } from "@/lib/cita/lookup";

export const Route = createFileRoute("/og/cita/$book/$pin")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const verse = getIndexedVerse(params.book, params.pin);
        if (!verse) {
          return new Response("Not found", {
            status: 404,
            headers: {
              "Cache-Control": "no-store, max-age=0, must-revalidate",
            },
          });
        }
        const { quoteOgPng } = await import("@/lib/quote-og-png");
        const png = quoteOgPng({
          reference: verseRef(verse),
          body: verse.text,
          theme: "light",
        });
        return new Response(new Uint8Array(png), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
