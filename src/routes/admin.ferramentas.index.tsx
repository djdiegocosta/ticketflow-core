import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Target, Wrench, CheckSquare, ImageIcon, History, BarChart3, Link2 } from "lucide-react";

const tools = [
  {
    name: "Histórico de Eventos",
    description: "Consulte o histórico de check-ins de todos os eventos.",
    icon: History,
    href: "/admin/historico",
  },
  {
    name: "Relatórios",
    description: "Acesse relatórios e análises detalhadas dos eventos.",
    icon: BarChart3,
    href: "/admin/relatorios",
  },
  {
    name: "Vitrine",
    description: "Gerencie banners e comunicados na área do cliente.",
    icon: ImageIcon,
    href: "/admin/ferramentas/vitrine",
  },
  {
    name: "Links de Venda",
    description: "Veja de onde vêm suas vendas por canal",
    icon: Link2,
    href: "/admin/ferramentas/links-de-venda",
  },
  {
    name: "Simulador de Evento",
    description: "Projete a viabilidade financeira antes do evento acontecer",
    icon: Calculator,
    href: "/admin/simulador",
  },
  {
    name: "Remarketing",
    description: "Recupere compradores que quase finalizaram uma compra",
    icon: Target,
    href: "/admin/remarketing",
  },
  {
    name: "Checklist do Evento",
    description: "Organize as tarefas do dia do evento para não esquecer nada",
    icon: CheckSquare,
    href: "/admin/checklist",
  },
];

function ToolsHubPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="group block rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-lg"
          >
            <div className="flex flex-col items-start gap-4">
              <div className="p-3 bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent-muted)] transition-colors">
                <tool.icon className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[var(--accent-text)]" />
              </div>
              <div>
                <h3 className="text-heading-2 text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-body text-[var(--text-secondary)] mt-1">{tool.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/ferramentas/")({
  component: ToolsHubPage,
});
