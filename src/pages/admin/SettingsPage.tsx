import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  Database,
  Download,
  ImageIcon,
  Settings2,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { MercadoPagoLogo } from "@/components/MercadoPagoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/theme";
import { useDesign } from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  environmentLabel,
  mpIntegrationMock,
  organizationMock,
  preferencesMock,
  type MpStatus,
} from "@/lib/settings-data";

type SectionId = "organizacao" | "mercadopago" | "design" | "preferencias" | "backup";

const sections: { id: SectionId; label: string; icon: typeof Settings2 }[] = [
  { id: "organizacao", label: "Organização", icon: Building2 },
  { id: "mercadopago", label: "Mercado Pago", icon: CreditCard },
  { id: "design", label: "Design", icon: Palette },
  { id: "preferencias", label: "Preferências", icon: Sliders },
  { id: "backup", label: "Backup de Dados", icon: Database },
];

const statusMap: Record<
  MpStatus,
  { label: string; description: string; icon: typeof Circle; wrapper: string; pill: string }
> = {
  nao_configurado: {
    label: "Não configurado",
    description: "Configure sua integração para vender online com Pix automático.",
    icon: Circle,
    wrapper: "border-[var(--border-default)] bg-[var(--bg-tertiary)]",
    pill: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  },
  conectado: {
    label: "Conectado",
    description: "Integração ativa e validada.",
    icon: CheckCircle2,
    wrapper: "border-[var(--accent)] bg-[var(--accent-muted)]",
    pill: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  },
  requer_atencao: {
    label: "Requer atenção",
    description: "Algum teste falhou ou uma credencial expirou. Revise a configuração.",
    icon: AlertTriangle,
    wrapper: "border-[var(--warning)] bg-[color-mix(in_oklab,var(--warning)_12%,transparent)]",
    pill: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]",
  },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-small text-[var(--text-secondary)]">{children}</label>;
}

function Panel({
  title,
  titleAdornment,
  children,
}: {
  title: string;
  titleAdornment?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 rounded-[var(--radius-md)]">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-heading-2 text-[var(--text-primary)]">{title}</h2>
        {titleAdornment}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const [active, setActive] = useState<SectionId>("organizacao");
  const [org, setOrg] = useState(organizationMock);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [unified, setUnified] = useState(preferencesMock.unifiedCheckinPdf);
  const { theme, setTheme } = useTheme();
  const design = useDesign();

  const mp = mpIntegrationMock;
  const status = statusMap[mp.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-8">
      <h1 className="text-heading-1 text-[var(--text-primary)]">Configurações</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Menu lateral secundário */}
        <nav className="w-full shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 lg:w-56 rounded-[var(--radius-md)]">
          <div className="flex flex-col gap-1">
            {sections.map((section) => {
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={[
                    "flex items-center gap-3 px-3 py-2 text-left text-body transition-colors",
                    isActive
                      ? "bg-[var(--accent-muted)] text-[var(--accent-text)] rounded-[var(--radius-sm)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)]",
                  ].join(" ")}
                >
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {active === "organizacao" && (
            <Panel title="Organização">
              <div className="space-y-2">
                <FieldLabel>Nome da organização</FieldLabel>
                <Input
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  className="rounded-none"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Logo</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo da organização" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-[var(--text-disabled)]" />
                    )}
                  </div>
                  <label className="cursor-pointer border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-2 text-body text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]">
                    Escolher imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setLogoPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>E-mail de contato</FieldLabel>
                  <Input
                    type="email"
                    value={org.email}
                    onChange={(e) => setOrg({ ...org, email: e.target.value })}
                    className="rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Telefone</FieldLabel>
                  <Input
                    value={org.phone}
                    onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                    className="rounded-none"
                  />
                </div>
              </div>

              <Button onClick={() => toast.success("Alterações salvas")}>Salvar alterações</Button>
            </Panel>
          )}

          {active === "mercadopago" && (
            <Panel title="Mercado Pago" titleAdornment={<MercadoPagoLogo height={24} />}>
              <div className={`border p-6 ${status.wrapper}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusIcon className="h-5 w-5" />
                  <span className={`px-2.5 py-1 text-micro ${status.pill}`}>{status.label}</span>
                </div>
                <p className="mt-3 text-body text-[var(--text-secondary)]">{status.description}</p>
                {mp.status === "conectado" && (
                  <p className="mt-2 text-small text-[var(--text-secondary)]">
                    Ambiente ativo: {environmentLabel(mp.environment)} · Última validação: {mp.lastValidation ?? "—"}
                  </p>
                )}
              </div>

              <Button asChild>
                <Link to="/admin/configuracoes/mercado-pago">
                  {mp.status === "nao_configurado" ? "Configurar Mercado Pago" : "Revisar configuração"}
                </Link>
              </Button>
            </Panel>
          )}

          {active === "design" && (
            <Panel title="Design">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-heading-3 text-[var(--text-primary)]">Cor de Destaque</h3>
                    <p className="text-small text-[var(--text-secondary)]">Escolha a cor de destaque do sistema.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { id: "green", label: "Verde neon", color: "#00e676" },
                      { id: "blue", label: "Azul neon", color: "#00B0FF" },
                      { id: "purple", label: "Roxo neon", color: "#D500F9" },
                      { id: "red", label: "Vermelho neon", color: "#FF1744" },
                    ].map((opt) => {
                      const isSelected = design.accent === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => design.setAccent(opt.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-3 border p-4 transition-all",
                            isSelected 
                              ? "border-[var(--accent)] bg-[var(--accent-muted)]" 
                              : "border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--border-default)]"
                          )}
                          style={isSelected ? { borderColor: opt.color } : {}}
                        >
                          <div 
                            className="h-8 w-8 rounded-full shadow-sm" 
                            style={{ backgroundColor: opt.color }}
                          />
                          <span className={cn(
                            "text-micro font-medium uppercase tracking-wider",
                            isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-secondary)]"
                          )}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 border-t border-[var(--border-subtle)] pt-6">
                  <div>
                    <h3 className="text-heading-3 text-[var(--text-primary)]">Estilo de Cantos</h3>
                    <p className="text-small text-[var(--text-secondary)]">Escolha o estilo visual dos cantos do sistema.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-sm">
                    {[
                      { id: "straight", label: "Retos", radius: "0px" },
                      { id: "rounded", label: "Arredondados", radius: "10px" },
                    ].map((opt) => {
                      const isSelected = design.radius === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => design.setRadius(opt.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-3 border p-4 transition-all",
                            isSelected 
                              ? "border-[var(--accent)] bg-[var(--accent-muted)]" 
                              : "border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--border-default)]"
                          )}
                        >
                          <div 
                            className="h-12 w-12 border-2 border-[var(--text-primary)]" 
                            style={{ borderRadius: opt.radius }}
                          />
                          <span className={cn(
                            "text-micro font-medium uppercase tracking-wider",
                            isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-secondary)]"
                          )}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {active === "preferencias" && (
            <Panel title="Preferências">
              <div className="space-y-2">
                <FieldLabel>Tema padrão da interface</FieldLabel>
                <div className="flex gap-2">
                  {(["light", "dark"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTheme(option)}
                      className={[
                        "border px-4 py-2 text-body transition-colors",
                        theme === option
                          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                          : "border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      ].join(" ")}
                    >
                      {option === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between gap-6 border-t border-[var(--border-subtle)] pt-6">
                <div>
                  <p className="text-body text-[var(--text-primary)]">Unificar listas de PDF de check-in</p>
                  <p className="text-small text-[var(--text-secondary)]">
                    Ativado: Vendas e Cortesias saem em uma única lista. Desativado: uma lista para cada.
                  </p>
                </div>
                <Switch checked={unified} onCheckedChange={setUnified} />
              </div>
            </Panel>
          )}

          {active === "backup" && (
            <Panel title="Backup de Dados">
              <p className="text-body text-[var(--text-secondary)]">
                A exportação inclui eventos, vendas, participantes, clientes e cortesias da sua organização.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button disabled className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar dados (JSON)
                </Button>
                <Button disabled variant="secondary" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar dados (CSV)
                </Button>
              </div>
              <p className="text-small text-[var(--text-secondary)]">
                Esta função ficará disponível após a conexão com o banco de dados.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
