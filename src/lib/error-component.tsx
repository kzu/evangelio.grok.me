import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-lit-red" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={1.75} />
      </span>
      <h1 className="font-display text-lg font-medium">Algo salió mal</h1>
      <p className="max-w-md font-sans text-sm break-words text-muted">
        {error.message || "Ocurrió un error inesperado. Recarga la página."}
      </p>
    </main>
  );
}
