import { createFileRoute, redirect } from "@tanstack/react-router";
import { isIsoDate, todayISO } from "@/lib/gospel/today";

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
    if (fecha && isIsoDate(fecha)) next.fecha = fecha;
    if (familia) next.familia = true;
    if (favorito) next.favorito = true;
    if (cita) next.cita = true;
    return next;
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/e/$date",
      params: { date: search.fecha && isIsoDate(search.fecha) ? search.fecha : todayISO() },
      search: {
        ...(search.familia ? { familia: true } : {}),
        ...(search.favorito ? { favorito: true } : {}),
        ...(search.cita ? { cita: true } : {}),
      },
    });
  },
});
