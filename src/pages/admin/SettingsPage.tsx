import { useState, useEffect } from "react";
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
  Loader2,
  Clock3,
  Thermometer,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { MercadoPagoLogo } from "@/components/MercadoPagoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDesign } from "@/lib/design";
import { cn } from "@/lib/utils";
import { preferencesMock, type MpStatus } from "@/lib/settings-data";
import {
  useOrganization,
  useUpdateOrganization,
  useMpConfig,
  useOperationalPreferences,
  useUpdateOperationalPreferences,
} from "@/lib/settings-queries";
import { supabase } from "@/integrations/supabase/client";

type SectionId = "organizacao" | "mercadopago" | "design" | "preferencias" | "backup";

const sections: { id: SectionId; label: string; icon: typeof Settings2 }[] = [
  { id: "organizacao", label: "Organização", icon: Building2 },
  { id: "mercadopago", label: "Mercado Pago", icon: CreditCard },
  { id: "design", label: "Design", icon: Palette },
  { id: "preferencias", label: "Preferências", icon: Sliders },
  { id: "backup", label: "Backup de Dados", icon: Database },
];

const statusMap: Record<MpStatus, { label: string; description: string; icon: typeof Circle; wrapper: string; pill: string }> = {
  nao_configurado: { label: "Não configurado", description: "Configure sua integração para vender online com Pix automático.", icon: Circle, wrapper: "border-[var(--border-default)] bg-[var(--bg-tertiary)]", pill: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" },
  conectado: { label: "Conectado", description: "Integração ativa e validada.", icon: CheckCircle2, wrapper: "border-[var(--accent)] bg-[var(--accent-muted)]", pill: "bg-[var(--accent-muted)] text-[var(--accent-text)]" },
  requer_atencao: { label: "Requer atenção", description: "Algum teste falhou ou uma credencial expirou. Revise a configuração.", icon: AlertTriangle, wrapper: "border-[var(--warning)] bg-[color-mix(in_oklab,var(--warning)_12%,transparent)]", pill: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]" },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-small text-[var(--text-secondary)]">{children}</label>;
}

function Panel({ title, titleAdornment, children }: { title: string; titleAdornment?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
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
  const { data: organization, isLoading: loadingOrg } = useOrganization();
  const updateOrgMutation = useUpdateOrganization();
  const { data: mpConfig, isLoading: loadingMp } = useMpConfig();
  const { data: operationalPreferences, isLoading: loadingPreferences } = useOperationalPreferences();
  const updatePreferencesMutation = useUpdateOperationalPreferences();
  const [orgForm, setOrgForm] = useState({ name: "", email: "", phone: "", logoUrl: "" });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [unified, setUnified] = useState(preferencesMock.unifiedCheckinPdf);
  const [pendingMinutes, setPendingMinutes] = useState(30);
  const [aquecendo, setAquecendo] = useState(10);
  const [quente, setQuente] = useState(25);
  const [explodindo, setExplodindo] = useState(50);
  const design = useDesign();

  useEffect(() => {
    if (organization) {
      setOrgForm({ name: organization.name, email: organization.contact_email || "", phone: organization.contact_phone || "", logoUrl: organization.logo_url || "" });
      if (organization.logo_url) setLogoPreview(organization.logo_url);
    }
  }, [organization]);

  useEffect(() => {
    if (operationalPreferences) {
      setPendingMinutes(operationalPreferences.pending_sale_expiration_minutes);
      setAquecendo(operationalPreferences.temperature_aquecendo_sales_per_day);
      setQuente(operationalPreferences.temperature_quente_sales_per_day);
      setExplodindo(operationalPreferences.temperature_explodindo_sales_per_day);
    }
  }, [operationalPreferences]);

  const mpStatus = (mpConfig as any)?.status || (mpConfig ? "conectado" : "nao_configurado");
  const status = statusMap[mpStatus as MpStatus];
  const StatusIcon = status.icon;

  const handleSaveOrg = () => updateOrgMutation.mutate({ name: orgForm.name, email: orgForm.email, phone: orgForm.phone, logo_url: orgForm.logoUrl });

  const handleSavePreferences = () => {
    const values = {
      pending_sale_expiration_minutes: Math.round(pendingMinutes),
      temperature_aquecendo_sales_per_day: Math.round(aquecendo),
      temperature_quente_sales_per_day: Math.round(quente),
      temperature_explodindo_sales_per_day: Math.round(explodindo),
    };
    if (values.pending_sale_expiration_minutes < 5 || values.pending_sale_expiration_minutes > 1440) {
      toast.error("O tempo de expiração deve estar entre 5 minutos e 24 horas.");
      return;
    }
    if (values.temperature_aquecendo_sales_per_day <= 0 || values.temperature_quente_sales_per_day <= values.temperature_aquecendo_sales_per_day || values.temperature_explodindo_sales_per_day <= values.temperature_quente_sales_per_day) {
      toast.error("Os limites de temperatura precisam estar em ordem crescente.");
      return;
    }
    updatePreferencesMutation.mutate(values);
  };

  if (loadingOrg || loadingMp || loadingPreferences) return <div className="p-8 text-center text-body text-text-secondary">Carregando configurações...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-heading-1 text-[var(--text-primary)]">{"\n"}</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="w-full shrink-0 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 lg:w-56">
          <div className="flex flex-col gap-1">
            {sections.map((section) => {
              const isActive = active === section.id;
              return <button key={section.id} type="button" onClick={() => setActive(section.id)} className={["flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-body transition-colors", isActive ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-accent/20 dark:ring-accent/40" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"].join(" ")}><section.icon className="h-4 w-4" /><span>{section.label}</span></button>;
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {active === "organizacao" && (
            <Panel title="Organização">
              <div className="space-y-2"><FieldLabel>Nome da organização</FieldLabel><Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} className="rounded-[var(--radius-sm)]" /></div>
              <div className="space-y-2"><FieldLabel>Logo</FieldLabel><div className="flex items-center gap-4"><div className="relative flex h-20 w-20 items-center justify-center overflow-hidden border border-[var(--border-default)] bg-[var(--bg-tertiary)]">{isUploading ? <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /> : logoPreview ? <img src={logoPreview} alt="Logo da organização" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-[var(--text-disabled)]" />}</div><label className={cn("cursor-pointer border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-2 text-body text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]", isUploading && "cursor-not-allowed opacity-50")}>{isUploading ? "Enviando..." : "Escolher imagem"}<input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !organization) return; if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; } setIsUploading(true); try { const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`; const filePath = `${organization.id}/${fileName}`; const { error: uploadError } = await supabase.storage.from('organization-logos').upload(filePath, file); if (uploadError) throw uploadError; const { data: { publicUrl } } = supabase.storage.from('organization-logos').getPublicUrl(filePath); setLogoPreview(publicUrl); setOrgForm(prev => ({ ...prev, logoUrl: publicUrl })); toast.success("Logo enviada com sucesso!"); } catch (err: any) { toast.error("Erro no upload: " + err.message); } finally { setIsUploading(false); } }} /></label></div></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><FieldLabel>E-mail de contato</FieldLabel><Input type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} className="rounded-[var(--radius-sm)]" /></div><div className="space-y-2"><FieldLabel>Telefone</FieldLabel><Input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} className="rounded-[var(--radius-sm)]" /></div></div>
              <Button onClick={handleSaveOrg} disabled={updateOrgMutation.isPending}>{updateOrgMutation.isPending ? "Salvando..." : "Salvar alterações"}</Button>
            </Panel>
          )}

          {active === "mercadopago" && <Panel title="Mercado Pago" titleAdornment={<MercadoPagoLogo height={24} />}><div className={`border p-6 ${status.wrapper}`}><div className="flex flex-wrap items-center gap-3"><StatusIcon className="h-5 w-5" /><span className={`px-2.5 py-1 text-micro ${status.pill}`}>{status.label}</span></div><p className="mt-3 text-body text-[var(--text-secondary)]">{status.description}</p>{mpStatus === "conectado" && mpConfig && <p className="mt-2 text-small text-[var(--text-secondary)]">Ambiente ativo: {(mpConfig as any).environment === 'sandbox' ? 'Sandbox' : 'Produção'}</p>}</div><Button asChild><Link to="/admin/configuracoes/mercado-pago">{mpStatus === "nao_configurado" ? "Configurar Mercado Pago" : "Revisar configuração"}</Link></Button></Panel>}

          {active === "design" && <Panel title="Design"><div className="space-y-6"><div className="space-y-4"><div><h3 className="text-heading-3 text-[var(--text-primary)]">Cor de Destaque</h3><p className="text-small text-[var(--text-secondary)]">Escolha a cor de destaque do sistema.</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[{ id: "green", label: "Verde", color: "#16a34a" }, { id: "blue", label: "Azul", color: "#2563eb" }, { id: "roxo", label: "Roxo", color: "#7c3aed" }, { id: "red", label: "Vermelho", color: "#dc2626" }].map((opt) => { const isSelected = design.accent === opt.id; return <button key={opt.id} type="button" onClick={() => design.setAccent(opt.id as any)} className={cn("flex flex-col items-center gap-3 border p-4 transition-all", isSelected ? "border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-accent/20 dark:ring-accent/40" : "border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--border-default)]")} style={isSelected ? { borderColor: opt.color } : {}}><div className="h-8 w-8 rounded-full shadow-sm" style={{ backgroundColor: opt.color }} /><span className={cn("text-micro font-medium uppercase tracking-wider", isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-secondary)]")}>{opt.label}</span></button>; })}</div></div></div></Panel>}

          {active === "preferencias" && (
            <Panel title="Preferências">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-icon-brand" /><FieldLabel>Expiração de vendas pendentes</FieldLabel></div>
                <p className="text-small text-[var(--text-secondary)]">Define por quanto tempo uma venda não paga permanece pendente. Depois desse prazo, ela passa para expirada e deixa de aparecer na lista operacional de vendas.</p>
                <div className="flex max-w-xs items-center gap-2"><Input type="number" min={5} max={1440} value={pendingMinutes} onChange={(e) => setPendingMinutes(Number(e.target.value))} className="rounded-[var(--radius-sm)]" /><span className="text-small text-[var(--text-secondary)]">minutos</span></div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-6">
                <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-icon-brand" /><div><p className="text-body text-[var(--text-primary)]">Temperatura do evento</p><p className="text-small text-[var(--text-secondary)]">Classificação baseada em vendas pagas nas últimas 24 horas.</p></div></div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2"><FieldLabel>Aquecendo a partir de</FieldLabel><div className="flex items-center gap-2"><Input type="number" min={1} value={aquecendo} onChange={(e) => setAquecendo(Number(e.target.value))} className="rounded-[var(--radius-sm)]" /><span className="text-small text-[var(--text-secondary)]">vendas/dia</span></div></div>
                  <div className="space-y-2"><FieldLabel>Quente a partir de</FieldLabel><div className="flex items-center gap-2"><Input type="number" min={1} value={quente} onChange={(e) => setQuente(Number(e.target.value))} className="rounded-[var(--radius-sm)]" /><span className="text-small text-[var(--text-secondary)]">vendas/dia</span></div></div>
                  <div className="space-y-2"><FieldLabel>Explodindo a partir de</FieldLabel><div className="flex items-center gap-2"><Input type="number" min={1} value={explodindo} onChange={(e) => setExplodindo(Number(e.target.value))} className="rounded-[var(--radius-sm)]" /><span className="text-small text-[var(--text-secondary)]">vendas/dia</span></div></div>
                </div>
                <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4"><div className="flex flex-wrap items-center gap-4 text-small"><span className="font-medium text-sky-400">Fria</span><span className="text-[var(--text-secondary)]">&lt; {aquecendo}</span><span className="font-medium text-warning">Aquecendo</span><span className="text-[var(--text-secondary)]">{aquecendo}–{Math.max(aquecendo, quente - 1)}</span><span className="font-medium text-error">Quente</span><span className="text-[var(--text-secondary)]">{quente}–{Math.max(quente, explodindo - 1)}</span><span className="font-medium text-error">Explodindo</span><span className="text-[var(--text-secondary)]">≥ {explodindo}</span><Flame className="ml-auto h-4 w-4 text-error" /></div></div>
              </div>

              <div className="flex items-start justify-between gap-6 border-t border-[var(--border-subtle)] pt-6"><div><p className="text-body text-[var(--text-primary)]">Unificar listas de PDF de check-in</p><p className="text-small text-[var(--text-secondary)]">Ativado: Vendas e Cortesias saem em uma única lista. Desativado: uma lista para cada.</p></div><Switch checked={unified} onCheckedChange={setUnified} /></div>
              <Button onClick={handleSavePreferences} disabled={updatePreferencesMutation.isPending}>{updatePreferencesMutation.isPending ? "Salvando..." : "Salvar preferências"}</Button>
            </Panel>
          )}

          {active === "backup" && <Panel title="Backup de Dados"><p className="text-body text-[var(--text-secondary)]">A exportação inclui eventos, vendas, participantes, clientes e cortesias da sua organização.</p><div className="flex flex-wrap gap-3"><Button disabled className="flex items-center gap-2"><Download className="h-4 w-4" />Exportar dados (JSON)</Button><Button disabled variant="secondary" className="flex items-center gap-2"><Download className="h-4 w-4" />Exportar dados (CSV)</Button></div><p className="text-small text-[var(--text-secondary)]">Recurso em desenvolvimento.</p></Panel>}
        </div>
      </div>
    </div>
  );
}
