import * as React from "react";
import {
  Activity,
  Plus,
  Rocket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Save,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SidePanel } from "@/components/admin/SidePanel";
import { filterFieldClass } from "@/components/admin/FilterBar";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableShell,
} from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { formatCurrency } from "@/lib/sales-queries";
import { calcBar, clampMarginPct, lotsFromBatches } from "@/lib/simulador-calc";
import { fetchEventWithBatches, useEvents } from "@/lib/events-queries";
import { formatName } from "@/lib/form-format";

/* -------------------------------------------------------------------------- */
/* Primitivas locais                                                          */
/* -------------------------------------------------------------------------- */

function StepSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent-muted text-small font-semibold text-accent-text">
          {step}
        </span>
        <h2 className="text-heading-2 text-text-primary">{title}</h2>
      </div>
      <div className="bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">{children}</div>
    </section>
  );
}

function BlockSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-heading-2 text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-small text-text-secondary">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(formatName(e.target.value))}
        className={cn(filterFieldClass, "w-full placeholder:text-text-disabled")}
      />
      {help && <p className="text-micro text-text-disabled">{help}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  help,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-small text-text-secondary">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-small text-text-disabled">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(toNumber(e.target.value))}
          className={cn(
            filterFieldClass,
            "w-full placeholder:text-text-disabled",
            prefix && "pl-9",
            suffix && "pr-16",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-micro text-text-disabled">
            {suffix}
          </span>
        )}
      </div>
      {help && <p className="text-micro text-text-disabled">{help}</p>}
    </div>
  );
}

const toNumber = (raw: string) => {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const cellInputClass =
  "w-full border border-border-default bg-bg-secondary px-2 py-1.5 text-body text-text-primary outline-none transition-colors focus:border-accent";

/* -------------------------------------------------------------------------- */
/* Estado                                                                     */
/* -------------------------------------------------------------------------- */

type Lot = {
  id: string;
  name: string;
  price: number;
  sold: number;
};

const INITIAL_LOTS: Lot[] = [
  { id: "l1", name: "Lote 1", price: 80, sold: 100 },
  { id: "l2", name: "Lote 2", price: 100, sold: 120 },
  { id: "l3", name: "Lote 3", price: 115, sold: 80 },
];

type Artist = { id: string; name: string; fee: number };

const INITIAL_ARTISTS: Artist[] = [{ id: "a1", name: "", fee: 0 }];

const OTHER_REVENUE_FIELDS = [
  { key: "patrocinios", label: "Patrocínios" },
  { key: "camarotes", label: "Camarotes / VIP" },
  { key: "outras", label: "Outras receitas" },
] as const;

const FIXED_COST_FIELDS = [
  { key: "aluguel", label: "Aluguel do espaço" },
  { key: "estrutura", label: "Estrutura — som, luz, palco" },
  { key: "marketing", label: "Marketing e divulgação" },
  { key: "outros", label: "Outros custos fixos" },
] as const;

type Amounts = Record<string, number>;

const emptyAmounts = (keys: readonly { key: string }[]): Amounts =>
  Object.fromEntries(keys.map((f) => [f.key, 0]));

const sumAmounts = (a: Amounts) => Object.values(a).reduce((acc, v) => acc + v, 0);

const SCENARIOS = [
  { label: "Pessimista", pct: 0.5, icon: TrendingDown, tone: "border-t-error" },
  { label: "Realista", pct: 0.7, icon: Activity, tone: "border-t-border-default" },
  { label: "Otimista", pct: 0.85, icon: TrendingUp, tone: "border-t-accent" },
  { label: "Lotação total", pct: 1, icon: Rocket, tone: "border-t-accent" },
] as const;

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

export function SimuladorPage() {
  const { organizationId } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [eventName, setEventName] = React.useState("");
  const [capacity, setCapacity] = React.useState(400);
  const [lots, setLots] = React.useState<Lot[]>(INITIAL_LOTS);
  const [courtesies, setCourtesies] = React.useState(0);
  const [importEventId, setImportEventId] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);
  const importRequestRef = React.useRef(0);
  const { data: events = [], isLoading: isLoadingEvents } = useEvents();
  const [otherRevenue, setOtherRevenue] = React.useState<Amounts>(() =>
    emptyAmounts(OTHER_REVENUE_FIELDS),
  );
  const [fixedCosts, setFixedCosts] = React.useState<Amounts>(() =>
    emptyAmounts(FIXED_COST_FIELDS),
  );
  const [artists, setArtists] = React.useState<Artist[]>(INITIAL_ARTISTS);
  const [securityQty, setSecurityQty] = React.useState(0);
  const [securityUnit, setSecurityUnit] = React.useState(0);
  const [staffQty, setStaffQty] = React.useState(0);
  const [staffUnit, setStaffUnit] = React.useState(0);
  const [hasBar, setHasBar] = React.useState(false);
  const [barAvgSpend, setBarAvgSpend] = React.useState(0);
  const [barExpectedMargin, setBarExpectedMargin] = React.useState(0);

  const updateArtist = (id: string, patch: Partial<Artist>) =>
    setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const addArtist = () =>
    setArtists((prev) => [...prev, { id: `a${Date.now()}`, name: "", fee: 0 }]);
  const removeArtist = (id: string) => setArtists((prev) => prev.filter((a) => a.id !== id));

  const updateLot = (id: string, patch: Partial<Lot>) =>
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLot = () =>
    setLots((prev) => [
      ...prev,
      {
        id: `l${Date.now()}`,
        name: `Lote ${prev.length + 1}`,
        price: 0,
        sold: 0,
      },
    ]);

  const removeLot = (id: string) => setLots((prev) => prev.filter((l) => l.id !== id));

  // Importa do evento real só o que é projeção: nome do evento e nome/preço dos lotes pagos.
  // Vendas estimadas começam em zero (o simulador nunca usa vendas reais) e o lote de
  // cortesia não vira lote pago.
  const importLots = async (eventId: string) => {
    setImportEventId(eventId);
    if (!eventId) return;
    const requestId = ++importRequestRef.current;
    setIsImporting(true);
    try {
      const { event, batches } = await fetchEventWithBatches(eventId);
      if (requestId !== importRequestRef.current) return;
      if (!event) throw new Error("Evento não encontrado");
      const importedLots = lotsFromBatches(event.id, batches);
      if (importedLots.length === 0) {
        toast.info("Este evento ainda não tem lotes de ingresso pagos para importar");
        return;
      }
      setEventName(event.title);
      setLots(importedLots);
      toast.success("Lotes importados. Agora estime quantos ingressos vai vender em cada um");
    } catch (error) {
      if (requestId !== importRequestRef.current) return;
      console.error("Erro ao importar lotes:", error);
      toast.error("Não foi possível importar os lotes deste evento");
    } finally {
      if (requestId === importRequestRef.current) setIsImporting(false);
    }
  };

  /* ----------------------------- cálculos ao vivo -------------------------- */

  const totalSold = lots.reduce((acc, l) => acc + l.sold, 0);
  const ticketRevenue = lots.reduce((acc, l) => acc + l.price * l.sold, 0);
  const otherRevenueTotal = sumAmounts(otherRevenue);

  const artistsTotal = artists.reduce((acc, a) => acc + a.fee, 0);
  const securityTotal = securityQty * securityUnit;
  const staffTotal = staffQty * staffUnit;
  const fixedTotal = sumAmounts(fixedCosts) + artistsTotal + securityTotal + staffTotal;

  // Bar: o custo dos produtos sai de Público total × Consumo médio × (100% − Margem bruta).
  const bar = calcBar({
    hasBar,
    totalSold,
    courtesies,
    avgSpend: barAvgSpend,
    expectedMarginPct: barExpectedMargin,
  });
  const totalAudience = bar.totalAudience;
  const barRevenue = bar.revenue;
  const barCost = bar.cost;
  const barProfit = bar.profit;

  const totalRevenue = ticketRevenue + otherRevenueTotal + barRevenue;
  const totalCosts = fixedTotal + barCost;
  const result = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (result / totalRevenue) * 100 : 0;
  const avgTicket = totalSold > 0 ? ticketRevenue / totalSold : 0;
  const breakEvenTickets = avgTicket > 0 ? Math.ceil(fixedTotal / avgTicket) : 0;
  const breakEvenPct = capacity > 0 ? Math.min(100, (breakEvenTickets / capacity) * 100) : 0;
  const breakEvenWithBar =
    avgTicket > 0 ? Math.ceil(Math.max(0, fixedTotal - barProfit) / avgTicket) : 0;
  const breakEvenWithBarPct = capacity > 0 ? Math.min(100, (breakEvenWithBar / capacity) * 100) : 0;
  const occupancyPct = capacity > 0 ? Math.min(100, (totalSold / capacity) * 100) : 0;
  const isProfit = result >= 0;

  const handleSave = async () => {
    if (!organizationId) return;
    if (!eventName.trim()) {
      toast.error("Dê um nome ao evento para salvar a simulação");
      return;
    }

    setIsSaving(true);
    try {
      const input_data = {
        capacity,
        lots,
        courtesies,
        otherRevenue,
        fixedCosts,
        artists,
        security: { qty: securityQty, unit: securityUnit },
        staff: { qty: staffQty, unit: staffUnit },
        bar: {
          hasBar,
          avgSpend: barAvgSpend,
          expectedMargin: barExpectedMargin,
        },
      };

      const result_summary = {
        totalRevenue,
        totalCosts,
        result,
        margin,
        breakEvenPct,
      };

      const { error } = await supabase.from("simulations").insert({
        organization_id: organizationId,
        event_name: eventName,
        input_data,
        result_summary,
      });

      if (error) throw error;
      toast.success("Simulação salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar simulação:", error);
      toast.error("Erro ao salvar simulação");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchHistory = async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setIsHistoryOpen(true);
    } catch (error) {
      toast.error("Erro ao buscar histórico");
    }
  };

  const loadSimulation = (sim: any) => {
    const data = sim.input_data as any;
    setEventName(sim.event_name);
    setCapacity(data.capacity || 0);
    setLots(
      ((data.lots || []) as Partial<Lot>[]).map((l) => ({
        id: l.id ?? `l${Date.now()}`,
        name: l.name ?? "",
        price: l.price || 0,
        sold: l.sold || 0,
      })),
    );
    setCourtesies(data.courtesies ?? data.bar?.courtesies ?? 0);
    setOtherRevenue(data.otherRevenue || emptyAmounts(OTHER_REVENUE_FIELDS));
    setFixedCosts({ ...emptyAmounts(FIXED_COST_FIELDS), ...(data.fixedCosts || {}) });
    setArtists(data.artists || []);
    setSecurityQty(data.security?.qty || 0);
    setSecurityUnit(data.security?.unit || 0);
    setStaffQty(data.staff?.qty || 0);
    setStaffUnit(data.staff?.unit || 0);
    setHasBar(data.bar?.hasBar || false);
    setBarAvgSpend(data.bar?.avgSpend || 0);
    setBarExpectedMargin(clampMarginPct(data.bar?.expectedMargin || 0));
    setIsHistoryOpen(false);
    toast.success("Simulação carregada!");
  };

  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-4 duration-500">
      <ListPageHeader
        title="Simulador de Evento"
        action={
          <div className="flex gap-3">
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 bg-bg-secondary px-4 py-2.5 text-body font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
            >
              <History className="h-4 w-4" />
              Histórico
            </button>
            <PrimaryActionButton onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar simulação"}
            </PrimaryActionButton>
          </div>
        }
      />

      {/* Etapa 1 */}
      <StepSection step={1} title="Dados gerais">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField
            label="Nome do evento"
            value={eventName}
            onChange={setEventName}
            placeholder="Meu Evento"
          />
          <NumberField
            label="Capacidade total em pessoas"
            value={capacity}
            onChange={setCapacity}
            help="Limite máximo de ingressos do seu evento"
          />
        </div>
      </StepSection>

      {/* Etapa 2 */}
      <StepSection step={2} title="Lotes de ingressos">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-small text-text-secondary">
            Estime quantos ingressos você espera vender em cada lote.
          </span>
          <select
            aria-label="Importar lotes de um evento"
            value={importEventId}
            disabled={isLoadingEvents || isImporting}
            onChange={(e) => void importLots(e.target.value)}
            className={cn(filterFieldClass, "sm:w-[260px]")}
          >
            <option value="">Importar lotes de um evento</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <DataTableShell>
          <DataTable>
            <DataTableHeadRow
              columns={["Lote", "Preço (R$)", "Qtd. vendida (estimada)", "Receita", ""]}
            />
            <tbody>
              {lots.map((lot) => (
                <DataTableRow key={lot.id}>
                  <DataTableCell variant="primary">
                    <input
                      aria-label="Nome do lote"
                      value={lot.name}
                      onChange={(e) => updateLot(lot.id, { name: formatName(e.target.value) })}
                      className={cn(cellInputClass, "min-w-[140px]")}
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <input
                      aria-label="Preço"
                      type="number"
                      min={0}
                      value={lot.price === 0 ? "" : lot.price}
                      placeholder="0"
                      onChange={(e) => updateLot(lot.id, { price: toNumber(e.target.value) })}
                      className={cn(cellInputClass, "w-[110px]")}
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <input
                      aria-label="Quantidade vendida estimada"
                      type="number"
                      min={0}
                      value={lot.sold === 0 ? "" : lot.sold}
                      placeholder="0"
                      onChange={(e) => updateLot(lot.id, { sold: toNumber(e.target.value) })}
                      className={cn(cellInputClass, "w-[110px]")}
                    />
                  </DataTableCell>
                  <DataTableCell variant="strong">
                    {formatCurrency(lot.price * lot.sold)}
                  </DataTableCell>
                  <DataTableCell>
                    <button
                      type="button"
                      aria-label={`Remover ${lot.name}`}
                      onClick={() => removeLot(lot.id)}
                      className="p-1.5 text-text-disabled transition-colors hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </DataTableCell>
                </DataTableRow>
              ))}
              {lots.length === 0 && (
                <DataTableRow>
                  <DataTableCell colSpan={5} variant="muted" className="text-center">
                    Nenhum lote adicionado.
                  </DataTableCell>
                </DataTableRow>
              )}
              <tr className="border-t border-border-default bg-bg-tertiary">
                <td className="px-4 py-3 text-small font-semibold text-text-primary">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-small font-semibold text-text-primary">
                  {totalSold}
                </td>
                <td className="px-4 py-3 text-small font-semibold text-text-primary">
                  {formatCurrency(ticketRevenue)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </DataTable>
        </DataTableShell>

        <button
          type="button"
          onClick={addLot}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-border-default px-4 py-2.5 text-small text-text-secondary transition-colors hover:border-accent hover:text-accent-text"
        >
          <Plus className="h-4 w-4" />
          Adicionar lote
        </button>

        <p className="mt-3 text-micro text-text-disabled">
          A receita mostrada é o valor de face dos ingressos, sem descontos.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-border-subtle pt-5 sm:grid-cols-2">
          <NumberField
            label="Quantidade de cortesias"
            value={courtesies}
            onChange={setCourtesies}
            help="Cortesias não entram na receita de ingressos, mas contam como público presente (usado no cálculo do bar)"
          />
          <div className="space-y-1.5">
            <span className="block text-small text-text-secondary">Público total estimado</span>
            <div className="text-heading-1 text-text-primary">{totalAudience}</div>
            <p className="text-micro text-text-disabled">
              Ingressos vendidos ({totalSold}) + cortesias ({courtesies})
            </p>
          </div>
        </div>
      </StepSection>

      {/* Etapa 3 — Bar do evento */}
      <StepSection step={3} title="Bar do evento">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-body text-text-primary">Este evento terá bar próprio?</span>
          <div className="flex">
            {[
              { label: "Sim", val: true },
              { label: "Não", val: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setHasBar(opt.val)}
                className={cn(
                  "px-5 py-2 text-small transition-colors",
                  hasBar === opt.val
                    ? "bg-accent-muted font-medium text-accent-text"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {hasBar && (
          <>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <NumberField
                label="Consumo médio por pessoa"
                prefix="R$"
                value={barAvgSpend}
                onChange={setBarAvgSpend}
              />
              <NumberField
                label="Margem bruta esperada"
                suffix="%"
                value={barExpectedMargin}
                onChange={(v) => setBarExpectedMargin(clampMarginPct(v))}
                help="De 0 a 100%. É a parte da receita do bar que sobra depois de pagar os produtos"
              />
            </div>

            <MiniMetricGrid className="mt-5">
              <MiniMetricCard
                title="Público total"
                value={totalAudience}
                subtext="Vendidos + cortesias"
              />
              <MiniMetricCard title="Receita bruta do bar" value={formatCurrency(barRevenue)} />
              <MiniMetricCard
                title="Custo total dos produtos do bar"
                value={formatCurrency(barCost)}
                subtext="Calculado automaticamente"
              />
              <MiniMetricCard title="Lucro do bar" value={formatCurrency(barProfit)} />
            </MiniMetricGrid>

            <p className="mt-3 text-micro text-text-disabled">
              Custo dos produtos = público total × consumo médio × (100% − margem bruta esperada).
            </p>
          </>
        )}
      </StepSection>

      {/* Etapa 4 */}
      <StepSection step={4} title="Custos fixos">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FIXED_COST_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              prefix="R$"
              value={fixedCosts[f.key] ?? 0}
              onChange={(v) => setFixedCosts((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </div>

        {/* Artistas */}
        <div className="mt-6 border-t border-border-subtle pt-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-body font-medium text-text-primary">
              Cachês artísticos / DJ / banda
            </span>
            <span className="text-small text-text-secondary">
              Total: {formatCurrency(artistsTotal)}
            </span>
          </div>
          <div className="space-y-3">
            {artists.map((a) => (
              <div key={a.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <input
                    aria-label="Nome do artista"
                    value={a.name}
                    placeholder="Nome do artista"
                    onChange={(e) => updateArtist(a.id, { name: e.target.value })}
                    className={cn(filterFieldClass, "w-full placeholder:text-text-disabled")}
                  />
                </div>
                <div className="w-[160px]">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-small text-text-disabled">
                      R$
                    </span>
                    <input
                      aria-label="Cachê"
                      type="number"
                      min={0}
                      value={a.fee === 0 ? "" : a.fee}
                      placeholder="0"
                      onChange={(e) => updateArtist(a.id, { fee: toNumber(e.target.value) })}
                      className={cn(filterFieldClass, "w-full pl-9 placeholder:text-text-disabled")}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remover artista"
                  onClick={() => removeArtist(a.id)}
                  className="p-2.5 text-text-disabled transition-colors hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addArtist}
            className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-border-default px-4 py-2.5 text-small text-text-secondary transition-colors hover:border-accent hover:text-accent-text"
          >
            <Plus className="h-4 w-4" />
            Adicionar artista
          </button>
        </div>

        {/* Segurança e equipe */}
        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-border-subtle pt-5 md:grid-cols-2">
          <div>
            <span className="mb-3 block text-body font-medium text-text-primary">Segurança</span>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Quantidade de seguranças"
                value={securityQty}
                onChange={setSecurityQty}
              />
              <NumberField
                label="Custo por segurança"
                prefix="R$"
                value={securityUnit}
                onChange={setSecurityUnit}
              />
            </div>
            <p className="mt-2 text-small text-text-secondary">
              Total: {formatCurrency(securityTotal)}
            </p>
          </div>
          <div>
            <span className="mb-3 block text-body font-medium text-text-primary">
              Equipe operacional
            </span>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Quantidade de pessoas" value={staffQty} onChange={setStaffQty} />
              <NumberField
                label="Custo por pessoa"
                prefix="R$"
                value={staffUnit}
                onChange={setStaffUnit}
              />
            </div>
            <p className="mt-2 text-small text-text-secondary">
              Total: {formatCurrency(staffTotal)}
            </p>
          </div>
        </div>

        <p className="mt-5 text-micro text-text-disabled">
          Custos fixos totais: {formatCurrency(fixedTotal)}
        </p>
      </StepSection>

      {/* Etapa 5 */}
      <StepSection step={5} title="Outras receitas">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {OTHER_REVENUE_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              prefix="R$"
              value={otherRevenue[f.key] ?? 0}
              onChange={(v) => setOtherRevenue((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </div>
      </StepSection>

      {/* Resultado financeiro */}
      <BlockSection title="Resultado Financeiro">
        <div className="bg-[#111111] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-small text-[#9a9a9a]">
                Resultado estimado (Lucro / Prejuízo)
              </span>
              <div
                className="mt-1 text-heading-1 sm:text-[32px] sm:leading-tight"
                style={{ color: isProfit ? "var(--accent)" : "var(--error)" }}
              >
                {formatCurrency(result)}
              </div>
            </div>
            <span
              className="inline-block rounded-[var(--radius-full)] px-3 py-1 text-micro font-medium"
              style={{
                color: isProfit ? "var(--accent)" : "var(--error)",
                backgroundColor: isProfit
                  ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                  : "color-mix(in srgb, var(--error) 15%, transparent)",
              }}
            >
              {isProfit ? "Projeção de lucro" : "Projeção de prejuízo"}
            </span>
          </div>
        </div>

        <MiniMetricGrid className="xl:grid-cols-3">
          <MiniMetricCard title="Receita total" value={formatCurrency(totalRevenue)} />
          <MiniMetricCard title="Custos totais" value={formatCurrency(totalCosts)} />
          <MiniMetricCard
            title="Margem"
            value={`${margin.toFixed(1)}%`}
            subtext="Sobre a receita total"
          />
        </MiniMetricGrid>

        <div className="bg-bg-secondary shadow-[var(--shadow-sm)]">
          {[
            { label: "Receita de ingressos", value: ticketRevenue },
            ...(hasBar ? [{ label: "(+) Receita bruta do bar", value: barRevenue }] : []),
            { label: "(+) Outras receitas", value: otherRevenueTotal },
            { label: "(−) Custos fixos", value: -fixedTotal },
            ...(hasBar ? [{ label: "(−) Custo do bar", value: -barCost }] : []),
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-border-subtle px-4 py-3"
            >
              <span className="text-small text-text-secondary">{row.label}</span>
              <span className="text-body text-text-primary">{formatCurrency(row.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-bg-tertiary px-4 py-3.5">
            <span className="text-body font-semibold text-text-primary">Lucro / Prejuízo</span>
            <span
              className="text-body font-semibold"
              style={{ color: isProfit ? "var(--accent-text)" : "var(--error)" }}
            >
              {formatCurrency(result)}
            </span>
          </div>
        </div>
      </BlockSection>

      {/* Painel do bar */}
      {hasBar && (
        <BlockSection title="Painel do Bar">
          <MiniMetricGrid className="xl:grid-cols-4">
            <MiniMetricCard title="Receita bruta do bar" value={formatCurrency(barRevenue)} />
            <MiniMetricCard title="Custo do bar" value={formatCurrency(barCost)} />
            <MiniMetricCard title="Lucro do bar" value={formatCurrency(barProfit)} />
            <MiniMetricCard
              title="Margem bruta esperada"
              value={`${bar.marginPct.toFixed(1)}%`}
              subtext="Define o custo dos produtos"
            />
          </MiniMetricGrid>
        </BlockSection>
      )}

      {/* Ponto de equilíbrio */}
      <BlockSection title="Ponto de Equilíbrio">
        <div className="space-y-6 bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">
          <div
            className={cn("grid grid-cols-1 gap-6", hasBar ? "sm:grid-cols-3" : "sm:grid-cols-2")}
          >
            <div>
              <span className="text-small text-text-secondary">
                Ingressos mínimos — sem considerar o bar
              </span>
              <div className="mt-1 text-heading-1 text-text-primary">{breakEvenTickets}</div>
              <p className="mt-0.5 text-small text-text-secondary">
                {breakEvenPct.toFixed(1)}% da capacidade
              </p>
            </div>
            {hasBar && (
              <div>
                <span className="flex items-center gap-2 text-small text-text-secondary">
                  Ingressos mínimos — considerando o bar
                  <span className="rounded-[var(--radius-full)] bg-accent-muted px-2 py-0.5 text-micro font-medium text-accent-text">
                    com bar
                  </span>
                </span>
                <div className="mt-1 text-heading-1 text-text-primary">{breakEvenWithBar}</div>
                <p className="mt-0.5 text-small text-text-secondary">
                  {breakEvenWithBarPct.toFixed(1)}% da capacidade · já desconta o lucro do bar
                </p>
              </div>
            )}
            <div>
              <span className="text-small text-text-secondary">Ticket médio líquido atual</span>
              <div className="mt-1 text-heading-1 text-text-primary">
                {formatCurrency(avgTicket)}
              </div>
              <p className="mt-0.5 text-small text-text-secondary">Por ingresso vendido</p>
            </div>
          </div>

          <div>
            <div className="relative h-2.5 w-full bg-bg-tertiary">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${occupancyPct}%` }}
              />
              <div
                className="absolute top-0 h-full w-[2px] bg-warning"
                style={{ left: `${breakEvenPct}%` }}
              />
            </div>
            <div className="relative mt-2 h-5 text-micro text-text-secondary">
              <span className="absolute left-0">0%</span>
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-warning"
                style={{ left: `${Math.min(92, Math.max(10, breakEvenPct))}%` }}
              >
                PE: {breakEvenPct.toFixed(0)}%
              </span>
              <span className="absolute right-0">100%</span>
            </div>
            <p className="mt-2 text-micro text-text-disabled">
              Ocupação estimada atual: {occupancyPct.toFixed(1)}% ({totalSold} de {capacity})
            </p>
          </div>
        </div>
      </BlockSection>

      {/* Cenários */}
      <BlockSection title="Cenários de ocupação">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => {
            const people = Math.round(capacity * s.pct);
            return (
              <div
                key={s.label}
                className={cn(" border-t-2 bg-bg-secondary p-4 shadow-[var(--shadow-sm)]", s.tone)}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span className="text-small text-text-secondary">{s.label}</span>
                  <s.icon className="h-4 w-4 text-text-secondary" />
                </div>
                <div className="text-heading-1 text-text-primary">
                  {formatCurrency(avgTicket * people)}
                </div>
                <p className="mt-0.5 text-small text-text-secondary">
                  {Math.round(s.pct * 100)}% da capacidade · {people} pessoas
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-micro text-text-disabled">
          Os cenários consideram apenas a receita de ingressos — a receita do bar depende do público
          presente estimado na etapa Bar do Evento.
        </p>
      </BlockSection>

      <p className="border-t border-border-subtle pt-4 text-small text-text-disabled">
        Esta ferramenta trabalha apenas com projeções — não usa nem altera dados reais de vendas.
      </p>

      <SidePanel
        title="Histórico de Simulações"
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      >
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="py-8 text-center text-small text-text-secondary">
              Nenhuma simulação salva.
            </div>
          ) : (
            history.map((sim) => (
              <div
                key={sim.id}
                onClick={() => loadSimulation(sim)}
                className="cursor-pointer border border-border-subtle bg-bg-secondary p-4 transition-colors hover:border-accent"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-heading-3 text-text-primary">{sim.event_name}</h3>
                  <span className="text-micro text-text-disabled">
                    {new Date(sim.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between text-small">
                  <span className="text-text-secondary">
                    Resultado:{" "}
                    <span
                      className={sim.result_summary.result >= 0 ? "text-success" : "text-error"}
                    >
                      {formatCurrency(sim.result_summary.result)}
                    </span>
                  </span>
                  <span className="text-text-disabled">
                    {Math.round(sim.result_summary.breakEvenPct)}% break-even
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </SidePanel>
    </div>
  );
}
