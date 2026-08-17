import * as React from "react";
import {
  Activity,
  Plus,
  Rocket,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListPageHeader } from "@/components/admin/PrimaryActionButton";
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
const EVENTS = [
  {
    id: "1",
    name: "Festa de Verão",
    lots: [
      { id: "1a", name: "1º Lote", price: 90 },
      { id: "1b", name: "2º Lote", price: 110 },
    ],
  },
  {
    id: "2",
    name: "Show do Ano",
    lots: [
      { id: "2a", name: "Pista", price: 90 },
      { id: "2b", name: "VIP", price: 180 },
    ],
  },
  {
    id: "3",
    name: "Festival Outono",
    lots: [{ id: "3a", name: "Ingresso único", price: 70 }],
  },
];
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
      <div className="border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </section>
  );
}

function BlockSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
  available: number;
  price: number;
  sold: number;
};

const INITIAL_LOTS: Lot[] = [
  { id: "l1", name: "Lote 1", available: 100, price: 80, sold: 100 },
  { id: "l2", name: "Lote 2", available: 150, price: 100, sold: 120 },
  { id: "l3", name: "Lote 3", available: 150, price: 115, sold: 80 },
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
  { key: "decoracao", label: "Decoração" },
  { key: "outros", label: "Outros custos fixos" },
] as const;

const VARIABLE_COST_FIELDS = [
  { key: "copos", label: "Copos / kit de entrada" },
  { key: "seguro", label: "Seguro por pessoa" },
  { key: "outros", label: "Outros variáveis por pessoa" },
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
  const [eventName, setEventName] = React.useState("");
  const [capacity, setCapacity] = React.useState(400);
  const [lots, setLots] = React.useState<Lot[]>(INITIAL_LOTS);
  const [importEventId, setImportEventId] = React.useState("");
  const [otherRevenue, setOtherRevenue] = React.useState<Amounts>(() =>
    emptyAmounts(OTHER_REVENUE_FIELDS),
  );
  const [fixedCosts, setFixedCosts] = React.useState<Amounts>(() =>
    emptyAmounts(FIXED_COST_FIELDS),
  );
  const [variableCosts, setVariableCosts] = React.useState<Amounts>(() =>
    emptyAmounts(VARIABLE_COST_FIELDS),
  );
  const [artists, setArtists] = React.useState<Artist[]>(INITIAL_ARTISTS);
  const [securityQty, setSecurityQty] = React.useState(0);
  const [securityUnit, setSecurityUnit] = React.useState(0);
  const [staffQty, setStaffQty] = React.useState(0);
  const [staffUnit, setStaffUnit] = React.useState(0);
  const [hasBar, setHasBar] = React.useState(false);
  const [barCourtesies, setBarCourtesies] = React.useState(0);
  const [barAvgSpend, setBarAvgSpend] = React.useState(0);
  const [barProductsCost, setBarProductsCost] = React.useState(0);
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
        available: 0,
        price: 0,
        sold: 0,
      },
    ]);

  const removeLot = (id: string) => setLots((prev) => prev.filter((l) => l.id !== id));

  const importLots = (eventId: string) => {
    setImportEventId(eventId);
    const event = EVENTS.find((e) => e.id === eventId);
    if (!event) return;
    setEventName(event.name);
    setLots(
      event.lots.map((lot, i) => ({
        id: `${event.id}-${lot.id}-${i}`,
        name: lot.name,
        available: 100,
        price: lot.price,
        sold: 0,
      })),
    );
  };

  /* ----------------------------- cálculos ao vivo -------------------------- */

  const totalAvailable = lots.reduce((acc, l) => acc + l.available, 0);
  const totalSold = lots.reduce((acc, l) => acc + l.sold, 0);
  const ticketRevenue = lots.reduce((acc, l) => acc + l.price * l.sold, 0);
  const otherRevenueTotal = sumAmounts(otherRevenue);

  const artistsTotal = artists.reduce((acc, a) => acc + a.fee, 0);
  const securityTotal = securityQty * securityUnit;
  const staffTotal = staffQty * staffUnit;
  const fixedTotal = sumAmounts(fixedCosts) + artistsTotal + securityTotal + staffTotal;

  const barAudience = hasBar ? totalSold + barCourtesies : 0;
  const barRevenue = hasBar ? barAvgSpend * barAudience : 0;
  const barCost = hasBar ? barProductsCost : 0;
  const barProfit = barRevenue - barCost;
  const barRealMargin = barRevenue > 0 ? (barProfit / barRevenue) * 100 : 0;

  const totalRevenue = ticketRevenue + otherRevenueTotal + barRevenue;
  const variablePerPerson = sumAmounts(variableCosts);
  const variableTotal = variablePerPerson * totalSold;
  const totalCosts = fixedTotal + variableTotal + barCost;
  const result = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (result / totalRevenue) * 100 : 0;
  const avgTicket = totalSold > 0 ? ticketRevenue / totalSold : 0;
  const breakEvenTickets = avgTicket > 0 ? Math.ceil(fixedTotal / avgTicket) : 0;
  const breakEvenPct = capacity > 0 ? Math.min(100, (breakEvenTickets / capacity) * 100) : 0;
  const breakEvenWithBar =
    avgTicket > 0 ? Math.ceil(Math.max(0, fixedTotal - barProfit) / avgTicket) : 0;
  const breakEvenWithBarPct =
    capacity > 0 ? Math.min(100, (breakEvenWithBar / capacity) * 100) : 0;
  const occupancyPct = capacity > 0 ? Math.min(100, (totalSold / capacity) * 100) : 0;
  const isProfit = result >= 0;

  return (
    <div className="animate-in space-y-10 fade-in slide-in-from-bottom-4 duration-500">
      <ListPageHeader title="Simulador de Evento" />

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
            onChange={(e) => importLots(e.target.value)}
            className={cn(filterFieldClass, "sm:w-[260px]")}
          >
            <option value="">Importar lotes de um evento</option>
            {EVENTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <DataTableShell>
          <DataTable>
            <DataTableHeadRow
              columns={[
                "Lote",
                "Qtd. disponível",
                "Preço (R$)",
                "Qtd. vendida (estimada)",
                "Receita",
                "",
              ]}
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
                      aria-label="Quantidade disponível"
                      type="number"
                      min={0}
                      value={lot.available === 0 ? "" : lot.available}
                      placeholder="0"
                      onChange={(e) =>
                        updateLot(lot.id, { available: toNumber(e.target.value) })
                      }
                      className={cn(cellInputClass, "w-[110px]")}
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
                  <DataTableCell colSpan={6} variant="muted" className="text-center">
                    Nenhum lote adicionado.
                  </DataTableCell>
                </DataTableRow>
              )}
              <tr className="border-t border-border-default bg-bg-tertiary">
                <td className="px-4 py-3 text-small font-semibold text-text-primary">Total</td>
                <td className="px-4 py-3 text-small font-semibold text-text-primary">
                  {totalAvailable}
                </td>
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
      </StepSection>

      {/* Etapa 3 — Bar do evento */}
      <StepSection step={3} title="Bar do evento">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-body text-text-primary">Este evento terá bar próprio?</span>
          <div className="flex border border-border-default">
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
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="Quantidade de cortesias"
                value={barCourtesies}
                onChange={setBarCourtesies}
                help="Cortesias não entram na receita de ingressos, mas contam como público presente para o cálculo do bar"
              />
              <NumberField
                label="Consumo médio por pessoa"
                prefix="R$"
                value={barAvgSpend}
                onChange={setBarAvgSpend}
              />
              <NumberField
                label="Custo total dos produtos do bar"
                prefix="R$"
                value={barProductsCost}
                onChange={setBarProductsCost}
              />
              <NumberField
                label="Margem bruta esperada"
                suffix="%"
                value={barExpectedMargin}
                onChange={setBarExpectedMargin}
              />
            </div>

            <div className="mt-5 border border-border-subtle bg-bg-tertiary p-4">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <div>
                  <span className="text-small text-text-secondary">Público presente (bar)</span>
                  <div className="text-heading-2 text-text-primary">{barAudience}</div>
                </div>
                <div>
                  <span className="text-small text-text-secondary">Receita bruta do bar</span>
                  <div className="text-heading-2 text-text-primary">
                    {formatCurrency(barRevenue)}
                  </div>
                </div>
                <div>
                  <span className="text-small text-text-secondary">Lucro do bar</span>
                  <div
                    className="text-heading-2"
                    style={{ color: barProfit >= 0 ? "var(--accent-text)" : "var(--error)" }}
                  >
                    {formatCurrency(barProfit)}
                  </div>
                </div>
                <div>
                  <span className="text-small text-text-secondary">Margem esperada vs. real</span>
                  <div className="text-heading-2 text-text-primary">
                    {barExpectedMargin.toFixed(1)}%{" "}
                    <span
                      style={{
                        color:
                          barRealMargin < barExpectedMargin ? "var(--error)" : "var(--accent-text)",
                      }}
                    >
                      / {barRealMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </StepSection>

      {/* Etapa 4 */}
      <StepSection step={4} title="Outras receitas">
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

      {/* Etapa 5 */}
      <StepSection step={5} title="Custos fixos">
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
              <NumberField
                label="Quantidade de pessoas"
                value={staffQty}
                onChange={setStaffQty}
              />
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

      {/* Etapa 6 */}
      <StepSection step={6} title="Custos variáveis (por pessoa presente)">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {VARIABLE_COST_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              prefix="R$"
              suffix="/pessoa"
              value={variableCosts[f.key] ?? 0}
              onChange={(v) => setVariableCosts((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </div>
        <p className="mt-3 text-micro text-text-disabled">
          Custo variável total = soma destes valores × quantidade total vendida (Etapa 2).
        </p>
      </StepSection>

      {/* Resultado financeiro */}
      <BlockSection title="Resultado Financeiro">
        <div className="border border-border-subtle bg-[#111111] p-6 shadow-[var(--shadow-sm)]">
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

        <div className="border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
          {[
            { label: "Receita de ingressos", value: ticketRevenue },
            ...(hasBar ? [{ label: "(+) Receita bruta do bar", value: barRevenue }] : []),
            { label: "(+) Outras receitas", value: otherRevenueTotal },
            { label: "(−) Custos fixos", value: -fixedTotal },
            ...(hasBar ? [{ label: "(−) Custo do bar", value: -barCost }] : []),
            { label: "(−) Custos variáveis", value: -variableTotal },
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
            <MiniMetricCard title="Margem esperada vs. real">
              <div className="text-heading-1 text-text-primary">
                {barExpectedMargin.toFixed(1)}%
              </div>
              <div
                className="mt-0.5 text-small"
                style={{
                  color:
                    barRealMargin < barExpectedMargin ? "var(--error)" : "var(--accent-text)",
                }}
              >
                Margem real calculada: {barRealMargin.toFixed(1)}%
              </div>
            </MiniMetricCard>
          </MiniMetricGrid>
        </BlockSection>
      )}

      {/* Ponto de equilíbrio */}
      <BlockSection title="Ponto de Equilíbrio">
        <div className="space-y-6 border border-border-subtle bg-bg-secondary p-5 shadow-[var(--shadow-sm)]">
          <div className={cn("grid grid-cols-1 gap-6", hasBar ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
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
                className={cn(
                  "border border-border-subtle border-t-2 bg-bg-secondary p-4 shadow-[var(--shadow-sm)]",
                  s.tone,
                )}
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
          Os cenários consideram apenas a receita de ingressos — a receita do bar depende do
          público presente estimado na etapa Bar do Evento.
        </p>
      </BlockSection>

      <p className="border-t border-border-subtle pt-4 text-small text-text-disabled">
        Esta ferramenta trabalha apenas com projeções — não usa nem altera dados reais de vendas.
      </p>
    </div>
  );
}
