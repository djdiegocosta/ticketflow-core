import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/checkin")({
  beforeLoad: ({ context }) => {
    // This route is public enough, but should be managed by AuthContext logic.
    // For now, let's keep it simple.
  },
  component: () => (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4">
      <h1 className="text-2xl font-bold">Check-in Module</h1>
      <p>Operador de Check-in view.</p>
    </div>
  ),
});