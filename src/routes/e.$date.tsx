import { createFileRoute, lazyRouteComponent, notFound, useRouter } from "@tanstack/react-router";
import { GospelError, GospelSkeleton } from "@/components/gospel-view";
import { emptyGospel } from "@/lib/gospel/empty";
import { isIsoDate } from "@/lib/gospel/today";

export type GospelSearch = {
  familia?: boolean;
  favorito?: boolean;
  cita?: boolean;
};

export const Route = createFileRoute("/e/$date")({
  validateSearch: (search: Record<string, unknown>): GospelSearch => {
    const familia =
      search.familia === true || search.familia === "true" || search.familia === "1";
    const favorito =
      search.favorito === true || search.favorito === "true" || search.favorito === "1";
    const cita = search.cita === true || search.cita === "true" || search.cita === "1";
    const next: GospelSearch = {};
    if (familia) next.familia = true;
    if (favorito) next.favorito = true;
    if (cita) next.cita = true;
    return next;
  },
  loaderDeps: ({ search }) => ({ familia: search.familia }),
  loader: async ({ params, deps }) => {
    if (!isIsoDate(params.date)) throw notFound();
    const edition = deps.familia ? "family" : "adult";
    try {
      const { fetchDailyGospel } = await import("@/lib/gospel/get-daily");
      return await fetchDailyGospel(params.date, edition);
    } catch (error) {
      console.error("[gospel] loader failed", error);
      return emptyGospel(params.date, edition, error);
    }
  },
  pendingMs: 120,
  pendingComponent: GospelSkeleton,
  errorComponent: GospelRouteError,
  head: ({ loaderData }) => {
    const quote = loaderData?.commentTitle?.trim();
    const title = quote ? `${quote} · Evangelio de Hoy` : "Evangelio de Hoy";
    return {
      meta: [
        { title },
        ...(quote
          ? [
              { property: "og:title", content: title },
              { name: "twitter:title", content: title },
            ]
          : []),
      ],
    };
  },
  component: lazyRouteComponent(() => import("@/components/home-page")),
});

function GospelRouteError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <main className="flex flex-1 flex-col bg-bg text-fg">
      <GospelError
        message={error.message || "Inténtalo de nuevo en unos instantes."}
        onRetry={() => {
          void router.invalidate();
        }}
      />
    </main>
  );
}
