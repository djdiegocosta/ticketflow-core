import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MEASURE_LABEL, type InsightsOrigin, type Measure, type PeriodPreset, type SaleTiming } from "@/lib/insights-format";

export interface InsightsFilterState {
  eventSel: string;
  preset: PeriodPreset;
  customFrom: string;
  customTo: string;
  origin: InsightsOrigin;
  countSaturday: boolean;
  leadMax: number;
  measure: Measure;
  timing: SaleTiming;
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
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={
            value === option.value
              ? "rounded-[var(--radius-sm)] bg-accent-muted px-3 py-2 text-small font-semibold text-accent-text"
              : "rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-3 py-2 text-small text-text-primary hover:border-text-secondary"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
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
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] bg-bg-secondary p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Evento">
          <Select value={state.eventSel} onValueChange={(eventSel) => onChange({ eventSel })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Histórico consolidado (todos os eventos)</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Analisar compras">
          <Segmented<SaleTiming>
            value={state.timing}
            onChange={(timing) => onChange({ timing })}
            options={[
              { value: "advance", label: "Antecipadas" },
              { value: "event_day", label: "No dia do evento" },
              { value: "all", label: "Todas" },
            ]}
          />
        </Field>

        <Field label="Período das compras">
          <Segmented<PeriodPreset>
            value={state.preset}
            onChange={(preset) => onChange({ preset })}
            options={[
              { value: "all", label: "Todo o histórico" },
              { value: "30d", label: "30 dias" },
              { value: "90d", label: "90 dias" },
              { value: "custom", label: "Datas específicas" },
            ]}
          />
          {state.preset === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <input type="date" aria-label="Data inicial" className={dateInput} value={state.customFrom} onChange={(event) => onChange({ customFrom: event.target.value })} />
              <input type="date" aria-label="Data final" className={dateInput} value={state.customTo} onChange={(event) => onChange({ customTo: event.target.value })} />
            </div>
          )}
        </Field>

        <Field label="Origem">
          <Segmented<InsightsOrigin>
            value={state.origin}
            onChange={(origin) => onChange({ origin })}
            options={[
              { value: "online", label: "Online" },
              { value: "manual", label: "Bilheteria" },
              { value: "all", label: "Todas" },
            ]}
          />
        </Field>
      </div>

      <div className="border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between gap-3 text-small font-medium text-text-secondary hover:text-text-primary"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros avançados
            <span className="font-normal text-text-disabled">
              {MEASURE_LABEL[state.measure]} · D-{state.leadMax} · sábado {state.countSaturday ? "conta" : "não conta"}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>

        {advancedOpen && (
          <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-3">
            <Field label="Métrica principal">
              <Segmented<Measure>
                value={state.measure}
                onChange={(measure) => onChange({ measure })}
                options={(Object.keys(MEASURE_LABEL) as Measure[]).map((measure) => ({
                  value: measure,
                  label: MEASURE_LABEL[measure],
                }))}
              />
            </Field>

            <Field label="Janela de antecedência">
              <Segmented<number>
                value={state.leadMax}
                onChange={(leadMax) => onChange({ leadMax })}
                options={[20, 30, 45, 60].map((days) => ({ value: days, label: `D-${days}` }))}
              />
            </Field>

            <Field label="Regra do 5º dia útil">
              <label className="flex min-h-10 items-center gap-3 text-small text-text-primary">
                <Switch checked={state.countSaturday} onCheckedChange={(countSaturday) => onChange({ countSaturday })} />
                Contar sábado como dia útil
              </label>
            </Field>
          </div>
        )}
      </div>
    </section>
  );
}
