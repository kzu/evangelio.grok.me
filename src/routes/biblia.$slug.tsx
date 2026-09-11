import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { parseUsfmSlug } from "@/lib/quote-ref";

export const Route = createFileRoute("/biblia/$slug")({
  beforeLoad: ({ params }) => {
    const parsed = parseUsfmSlug(params.slug);
    if (!parsed) throw notFound();
    throw redirect({
      to: "/citas/$slug",
      params: { slug: parsed.slug },
    });
  },
});
