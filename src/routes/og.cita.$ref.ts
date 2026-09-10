import { createFileRoute } from "@tanstack/react-router";
import { quoteSlug } from "@/lib/quote-ref";

export const Route = createFileRoute("/og/cita/$ref")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { findQuoteBySlug } = await import("@/lib/quotes-public.server");
        const { quoteOgPng } = await import("@/lib/quote-og-png");
        const quote = await findQuoteBySlug(quoteSlug(params.ref));
        if (!quote) {
          return new Response("Not found", {
            status: 404,
            headers: {
              "Cache-Control": "no-store, max-age=0, must-revalidate",
              "CDN-Cache-Control": "no-store",
            },
          });
        }
        const png = quoteOgPng({ reference: quote.reference, body: quote.body });
        return new Response(new Uint8Array(png), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=300, must-revalidate",
          },
        });
      },
    },
  },
});
