import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Calculator, Target, Gift, Wrench, CheckSquare, ImageIcon, History } from 'lucide-react'

export const Route = createFileRoute('/admin/ferramentas/')({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  component: ToolsHubPage,
})

const tools = [
  {
    name: "Histórico de Eventos",
    description: "Consulte o histórico de check-ins de todos os eventos.",
    icon: History,
    href: "/admin/historico",
  },
  {
    name: "Vitrine",
    description: "Gerencie banners e comunicados na área do cliente.",
    icon: ImageIcon,
    href: "/admin/ferramentas/vitrine",
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
  }
]

function ToolsHubPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-heading-1 text-[var(--text-primary)]"></h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="group block bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-lg rounded-none"
          >
            <div className="flex flex-col items-start gap-4">
              <div className="p-3 bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent-muted)] transition-colors">
                <tool.icon className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[var(--accent-text)]" />
              </div>
              <div>
                <h3 className="text-heading-2 text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-body text-[var(--text-secondary)] mt-1">
                  {tool.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
