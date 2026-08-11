import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/checkin")({
  beforeLoad: () => {
    throw redirect({ to: "/checkin", replace: true });
  },
  component: () => null,
});
