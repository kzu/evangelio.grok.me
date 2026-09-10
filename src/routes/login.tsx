import { createFileRoute } from "@tanstack/react-router";
import { SignInPanel } from "@/components/sign-in-panel";

type Search = {
  next?: string;
  accion?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof search.next === "string") next.next = search.next;
    if (typeof search.accion === "string") next.accion = search.accion;
    return next;
  },
  component: Login,
});

function Login() {
  const { next, accion } = Route.useSearch();
  return <SignInPanel next={next} reason={accion} />;
}
