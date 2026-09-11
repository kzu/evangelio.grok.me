import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/citas/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/biblia/$slug",
      params: { slug: params.slug },
    });
  },
});
