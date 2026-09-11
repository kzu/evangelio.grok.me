import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/citas/$slug")({
  beforeLoad: ({ params }) => {
    if (/\.png$/i.test(params.slug)) return;
    throw redirect({
      to: "/biblia/$slug",
      params: { slug: params.slug },
    });
  },
  component: () => null,
});
