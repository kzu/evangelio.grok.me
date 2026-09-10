import { createFileRoute, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { GospelError, GospelSkeleton } from "@/components/gospel-view";
import { emptyGospel } from "@/lib/gospel/empty";

type Search = {
  fecha?: string;
  familia?: boolean;
  favorito?: boolean;
  cita?: boolean;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const fecha = typeof search.fecha === "string" ? search.fecha : undefined;
    const familia =
      search.familia === true || search.familia === "true" || search.familia === "1";
    const favorito =
      search.favorito === true || search.favorito === "true" || search.favorito === "1";
    const cita = search.cita === true || search.cita === "true" || search.cita === "1";
    const next: Search = {};
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) next.fecha = fecha;
    if (familia) next.familia = true;
    if (favorito) next.favorito = true;
    if (cita) next.cita = true;
    return next;
  },
  loaderDeps: ({ search }) => ({ fecha: search.fecha, familia: search.familia }),
  loader: async ({ deps }) => {
    const edition = deps.familia ? "family" : "adult";
    try {
      const { fetchDailyGospel } = await import("@/lib/gospel/get-daily");
      return await fetchDailyGospel(deps.fecha, edition);
    } catch (error) {
      console.error("[gospel] loader failed", error);
      return emptyGospel(deps.fecha, edition, error);
    }
  },
  pendingMs: 120,
  pendingComponent: GospelSkeleton,
  errorComponent: GospelRouteError,
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
