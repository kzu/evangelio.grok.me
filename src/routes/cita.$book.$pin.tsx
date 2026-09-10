import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cita/$book/$pin")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/citas/$book/$pin",
      params: { book: params.book, pin: params.pin },
    });
  },
});
