import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MEASURE_LABEL, type InsightsOrigin, type Measure, type PeriodPreset } from "@/lib/insights-format";

export interface InsightsFilterState {
  eventSel: string; // "all" ou id do evento
  preset: PeriodPreset;
  customFrom: string;
  customTo: string;
  origin: InsightsOrigin;
  countSaturday: boolean;
  leadMax: number;
  measure: Measure;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-2 text-small font-semibold text-accent-text"
              : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-2 text-small text-text-primary hover:border-text-secondary"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-micro font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      {children}
    </div>
  );
}

const dateInput =
  "w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-primary px-3 py-2 text-small text-text-primary outline-none focus:border-accent";

export function InsightsFilters({
  state,
  onChange,
  events,
}: {
  state: InsightsFilterState;
  onChange: (patch: Partial<InsightsFilterState>) => void;
  events: ReadonlyArray<{ id: string; title: string }>;
}) {
  return (
    <section className="space-y-4 rounded-[var(--radius-md)] bg-bg-secondary p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Evento">
          <Select value={state.eventSel} onValueChange={(v) => onChange({ eventSel: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Histórico consolidado (todos os eventos)</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Medir por">
          <Segmented<Measure>
            value={state.measure}
            onChange={(measure) => onChange({ measure })}
            options={(Object.keys(MEASURE_LABEL) as Measure[]).map((m) => ({ value: m, label: MEASURE_LABEL[m] }))}
          />
        </Field>
        <Field label="Período das compras">
          <Segmented<PeriodPreset>
            value={state.preset}
            onChange={(preset) => onChange({ preset })}
            options={[
              { value: "all", label: "Tudo" },
              { value: "30d", label: "Últimos 30 dias" },
              { value: "90d", label: "Últimos 90 dias" },
              { value: "custom", label: "Escolher datas" },
            ]}
          />
          {state.preset === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <input type="date" aria-label="De" className={dateInput} value={state.customFrom} onChange={(e) => onChange({ customFrom: e.target.value })} />
              <input type="date" aria-label="Até" className={dateInput} value={state.customTo} onChange={(e) => onChange({ customTo: e.target.value })} />
            </div>
          )}
        </Field>
        <Field label="Origem das vendas">
          <Segmented<InsightsOrigin>
            value={state.origin}
            onChange={(origin) => onChange({ origin })}
            options={[
              { value: "online", label: "Online" },
              { value: "manual", label: "Bilheteria (manual)" },
              { value: "all", label: "Todas" },
            ]}
          />
        </Field>
        <Field label="Janela de antecedência">
          <Segmented<number>
            value={state.leadMax}
            onChange={(leadMax) => onChange({ leadMax })}
            options={[20, 30, 45, 60].map((n) => ({ value: n, label: `D-${n} a D0` }))}
          />
        </Field>
        <Field label="5º dia útil">
          <label className="flex items-center gap-3 text-small text-text-primary">
            <Switch checked={state.countSaturday} onCheckedChange={(countSaturday) => onChange({ countSaturday })} />
            Contar o sábado como dia útil
          </label>
        </Field>
      </div>
    </section>
  );
}
