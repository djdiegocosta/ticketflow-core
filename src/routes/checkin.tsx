import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckinPage } from "@/pages/CheckinPage";

export const Route = createFileRoute("/checkin")({
  beforeLoad: ({ location }) => {
    // In a real app we'd check auth here. 
    // Auth guard is handled in CheckinPage via useAuth if needed.
  },
  component: CheckinPage,
});