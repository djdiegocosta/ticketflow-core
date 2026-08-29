import { createFileRoute } from "@tanstack/react-router";
import DiagnosticLogsPage from "@/pages/admin/DiagnosticLogsPage";

export const Route = createFileRoute("/admin/ferramentas/diagnostic")({
  component: DiagnosticLogsPage,
});
