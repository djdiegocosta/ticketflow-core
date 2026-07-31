import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login | TicketFlow" },
      { name: "description", content: "Tela de acesso do produtor e do cliente." },
      { property: "og:title", content: "Login | TicketFlow" },
      { property: "og:description", content: "Tela de acesso do produtor e do cliente." },
    ],
  }),
  component: Page_login,
});

function Page_login() {
  return <Placeholder title="Login" description="Tela de acesso do produtor e do cliente." />;
}
