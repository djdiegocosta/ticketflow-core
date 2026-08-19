import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";

export const Route = createFileRoute("/superadmin")({
  component: SuperAdminLayout,
});
