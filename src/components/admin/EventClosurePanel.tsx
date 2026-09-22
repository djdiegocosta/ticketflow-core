import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  DollarSign,
  Ticket,
  Users,
  Wine,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/sales-queries";
import {
  useCloseEvent,
  useEventClosurePreview,
  type CloseEventInput,
} from "@/lib/event-history-queries";
import type { EventRow } from "@/lib/events-queries";

const STEPS = [
  { label: "Público e bilheteria", icon: Users },
  { label: "Bar", icon: Wine },
  { label: "Custos", icon: DollarSign },
  { label: "Revisão", icon: ClipboardCheck },
] as const;

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent";

const labelClass = "mb-2 block text-small font-medium text-text-secondary";

function toNumber(value: string) {
  const normalized = value.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-small text-text-secondary">{label}</span>
      <span className={cn("text-body text-text-primary", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function MetricPreview({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-bg-tertiary p-4">
      <p className="text-small text-text-secondary">{label}</p>
      <p className="mt-1 break-words text-heading-2 text-text-primary">{value}</p>
      {description && <p className="mt-0.5 text-micro text-text-secondary">{description}</p>}
    </div>
  );
}

export function EventClosurePanel({
  event,
  open,
  onClose,
  onCompleted,
}: {
  event: EventRow | null;
  open: boolean;
  onClose: () => void;
  onCompleted?: (snapshot: unknown) => void;
}) {
  const [step, setStep] = useState(1);
  const [boxOfficeQuantity, setBoxOfficeQuantity] = useState("0");
  const [boxOfficeRevenue, setBoxOfficeRevenue] = useState("0");
  const [courtesiesPresent, setCourtesiesPresent] = useState("0");
  const [attendancePresent, setAttendancePresent] = useState("");
  const [barRevenue, setBarRevenue] = useState("0");
  const [barProductCost, setBarProductCost] = useState("0");
  const [eventCost, setEventCost] = useState("0");
  const [notes, setNotes] = useState("");

  const previewQuery = useEventClosurePreview(open && event ? event.id : null);
  const closeMutation = useCloseEvent();

  const preview = previewQuery.data;
  const parsed = useMemo(
    () => ({
      boxOfficeQuantity: Math.max(0, Math.floor(toNumber(boxOfficeQuantity))),
      boxOfficeRevenue: Math.max(0, toNumber(boxOfficeRevenue)),
      courtesiesPresent: Math.max(0, Math.floor(toNumber(courtesiesPresent))),
      attendancePresent: Math.max(0, Math.floor(toNumber(attendancePresent))),
      barRevenue: Math.max(0, toNumber(barRevenue)),
      barProductCost: Math.max(0, toNumber(barProductCost)),
      eventCost: Math.max(0, toNumber(eventCost)),
    }),
    [
      boxOfficeQuantity,
      boxOfficeRevenue,
      courtesiesPresent,
      attendancePresent,
      barRevenue,
      barProductCost,
      eventCost,
    ],
  );

  const paidTickets = preview?.paidTickets ?? 0;
  const ticketRevenue = (preview?.ticketRevenue ?? 0) + parsed.boxOfficeRevenue;
  const totalRevenue = ticketRevenue + parsed.barRevenue;
  const totalCosts = parsed.eventCost + parsed.barProductCost;
  const netResult = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;
  const barGrossResult = parsed.barRevenue - parsed.barProductCost;
  const barCostPercent = parsed.barRevenue > 0 ? (parsed.barProductCost / parsed.barRevenue) * 100 : 0;
  const totalPaidTickets = paidTickets + parsed.boxOfficeQuantity;
  const ticketAverage = totalPaidTickets > 0 ? ticketRevenue / totalPaidTickets : 0;
  const consumptionAverage =
    parsed.attendancePresent > 0 ? parsed.barRevenue / parsed.attendancePresent : 0;
  const presaleShare = totalPaidTickets > 0 ? (paidTickets / totalPaidTickets) * 100 : 0;
  const courtesyShare =
    parsed.attendancePresent > 0
      ? (parsed.courtesiesPresent / parsed.attendancePresent) * 100
      : 0;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBoxOfficeQuantity("0");
    setBoxOfficeRevenue("0");
    setCourtesiesPresent("0");
    setAttendancePresent("");
    setBarRevenue("0");
    setBarProductCost("0");
    setEventCost("0");
    setNotes("");
  }, [open, event?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeMutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeMutation.isPending, onClose]);

  useEffect(() => {
    if (!open || !preview) return;
    setCourtesiesPresent((current) =>
      current === "0" ? String(preview.courtesyCheckins) : current,
    );
    setAttendancePresent((current) =>
      current === "" ? String(preview.checkins + preview.courtesyCheckins) : current,
    );
  }, [open, preview]);

  if (!open || !event) return null;

  const canFinish = attendancePresent.trim() !== "" && parsed.attendancePresent >= 0;

  const nextStep = () => setStep((current) => Math.min(current + 1, STEPS.length));
  const previousStep = () => setStep((current) => Math.max(current - 1, 1));

  const handleFinish = async () => {
    if (!canFinish || closeMutation.isPending) return;

    const input: CloseEventInput = {
      eventId: event.id,
      boxOfficeQuantity: parsed.boxOfficeQuantity,
      boxOfficeRevenue: parsed.boxOfficeRevenue,
      courtesiesPresent: parsed.courtesiesPresent,
      attendancePresent: parsed.attendancePresent,
      barRevenue: parsed.barRevenue,
      barProductCost: parsed.barProductCost,
      eventCost: parsed.eventCost,
      notes,
    };

    try {
      const snapshot = await closeMutation.mutateAsync(input);
      toast.success("Evento encerrado e salvo no Histórico de Eventos.");
      onCompleted?.(snapshot);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível encerrar o evento.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeMutation.isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-closure-title"
        className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle bg-bg-primary shadow-[var(--shadow-lg)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4 sm:px-6">
          <div>
            <p className="text-micro font-medium uppercase tracking-wide text-text-secondary">
              Encerramento do evento
            </p>
            <h2 id="event-closure-title" className="mt-0.5 text-heading-2 text-text-primary">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            disabled={closeMutation.isPending}
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="shrink-0 border-b border-border-subtle bg-bg-secondary/60 p-4 md:w-[230px] md:border-b-0 md:border-r md:p-5">
            <div className="space-y-1">
              {STEPS.map((item, index) => {
                const stepNumber = index + 1;
                const Icon = item.icon;
                const active = step === stepNumber;
                const reached = step >= stepNumber;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => stepNumber <= step && setStep(stepNumber)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-accent-muted text-accent-text"
                        : reached
                          ? "text-text-primary hover:bg-bg-tertiary"
                          : "text-text-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-small font-semibold",
                        reached
                          ? "border-accent bg-accent text-[var(--accent-foreground)]"
                          : "border-border-default bg-bg-primary",
                      )}
                    >
                      {reached && stepNumber < step ? <Check className="h-4 w-4" /> : stepNumber}
                    </span>
                    <span className="hidden min-w-0 text-small font-medium md:block">{item.label}</span>
                    <Icon className="ml-auto hidden h-4 w-4 md:block" />
                  </button>
                );
              })}
            </div>
            <div className="mt-5 hidden rounded-[var(--radius-sm)] bg-bg-tertiary p-3 md:block">
              <p className="text-micro text-text-secondary">
                Os dados do TicketFlow são preenchidos automaticamente. Você informa apenas o que aconteceu fora do sistema.
              </p>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-5 sm:p-7">
              {previewQuery.isLoading && (
                <div className="mb-5 rounded-[var(--radius-sm)] bg-bg-secondary p-4 text-small text-text-secondary">
                  Carregando os dados de vendas do TicketFlow...
                </div>
              )}

              {previewQuery.error && (
                <div className="mb-5 rounded-[var(--radius-sm)] border border-error/30 bg-error-muted p-4 text-small text-error-text">
                  Não foi possível carregar os dados automáticos do evento. Feche e tente novamente.
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-heading-2 text-text-primary">Público e bilheteria</h3>
                    <p className="mt-1 text-small text-text-secondary">
                      Confira os dados automáticos e informe os números da bilheteria e do público presente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MetricPreview
                      label="Ingressos antecipados"
                      value={String(paidTickets)}
                      description="vendas pagas pelo TicketFlow"
                    />
                    <MetricPreview
                      label="Receita antecipada"
                      value={formatCurrency(preview?.ticketRevenue ?? 0)}
                      description="vendas pagas pelo TicketFlow"
                    />
                  </div>

                  <div>
                    <p className="mb-3 text-small font-medium text-text-primary">
                      Dados informados no encerramento
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="closure-box-quantity">
                          Ingressos na bilheteria
                        </label>
                        <input
                          id="closure-box-quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={boxOfficeQuantity}
                          onChange={(event) => setBoxOfficeQuantity(event.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="closure-box-revenue">
                          Receita da bilheteria (R$)
                        </label>
                        <input
                          id="closure-box-revenue"
                          type="number"
                          min="0"
                          step="0.01"
                          value={boxOfficeRevenue}
                          onChange={(event) => setBoxOfficeRevenue(event.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="closure-courtesies">
                          Cortesias presentes
                        </label>
                        <input
                          id="closure-courtesies"
                          type="number"
                          min="0"
                          step="1"
                          value={courtesiesPresent}
                          onChange={(event) => setCourtesiesPresent(event.target.value)}
                          className={inputClass}
                        />
                        {preview && (
                          <p className="mt-1 text-micro text-text-secondary">
                            Referência: {preview.courtesyCheckins} check-ins de cortesia no TicketFlow.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="closure-attendance">
                          Público presente
                        </label>
                        <input
                          id="closure-attendance"
                          type="number"
                          min="0"
                          step="1"
                          value={attendancePresent}
                          onChange={(event) => setAttendancePresent(event.target.value)}
                          className={inputClass}
                        />
                        {preview && (
                          <p className="mt-1 text-micro text-text-secondary">
                            Referência: {preview.checkins + preview.courtesyCheckins} check-ins no TicketFlow.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {preview?.batches.length ? (
                    <div className="rounded-[var(--radius-sm)] border border-border-subtle bg-bg-secondary p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-text-secondary" />
                        <p className="text-small font-medium text-text-primary">
                          Vendas antecipadas por lote
                        </p>
                      </div>
                      <div className="divide-y divide-border-subtle">
                        {preview.batches.map((batch) => (
                          <div
                            key={batch.id}
                            className="flex items-center justify-between gap-4 py-2 text-small"
                          >
                            <span className="text-text-secondary">{batch.name}</span>
                            <span className="font-medium text-text-primary">
                              {batch.quantity} · {formatCurrency(batch.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-heading-2 text-text-primary">Bar</h3>
                    <p className="mt-1 text-small text-text-secondary">
                      Informe a venda total e o custo real dos produtos. O custo não é calculado por percentual.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="closure-bar-revenue">
                        Venda total do bar (R$)
                      </label>
                      <input
                        id="closure-bar-revenue"
                        type="number"
                        min="0"
                        step="0.01"
                        value={barRevenue}
                        onChange={(event) => setBarRevenue(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="closure-bar-cost">
                        Custo dos produtos do bar (R$)
                      </label>
                      <input
                        id="closure-bar-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={barProductCost}
                        onChange={(event) => setBarProductCost(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricPreview label="Resultado bruto" value={formatCurrency(barGrossResult)} />
                    <MetricPreview
                      label="Custo sobre venda"
                      value={(parsed.barRevenue > 0 ? barCostPercent : 0).toFixed(1) + "%"}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-heading-2 text-text-primary">Custos</h3>
                    <p className="mt-1 text-small text-text-secondary">
                      Informe o custo total do evento, sem incluir o custo dos produtos do bar já informado na etapa anterior.
                    </p>
                  </div>

                  <div className="max-w-md">
                    <label className={labelClass} htmlFor="closure-event-cost">
                      Custo total do evento (R$)
                    </label>
                    <input
                      id="closure-event-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={eventCost}
                      onChange={(event) => setEventCost(event.target.value)}
                      className={inputClass}
                    />
                    <p className="mt-2 text-micro text-text-secondary">
                      Não detalhe atrações, espaço, som, segurança ou staff aqui. O histórico guarda apenas o total.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-heading-2 text-text-primary">Revisão</h3>
                    <p className="mt-1 text-small text-text-secondary">
                      Confira os números. Ao finalizar, o evento será encerrado e este resultado ficará congelado no histórico.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <section className="rounded-[var(--radius-sm)] bg-bg-secondary p-4">
                      <p className="mb-2 text-small font-medium text-text-primary">Público</p>
                      <SummaryRow label="Ingressos antecipados" value={String(paidTickets)} />
                      <SummaryRow label="Ingressos bilheteria" value={String(parsed.boxOfficeQuantity)} />
                      <SummaryRow label="Cortesias presentes" value={String(parsed.courtesiesPresent)} />
                      <SummaryRow label="Público presente" value={String(parsed.attendancePresent)} strong />
                    </section>

                    <section className="rounded-[var(--radius-sm)] bg-bg-secondary p-4">
                      <p className="mb-2 text-small font-medium text-text-primary">Receitas</p>
                      <SummaryRow label="Ingressos" value={formatCurrency(ticketRevenue)} />
                      <SummaryRow label="Bar" value={formatCurrency(parsed.barRevenue)} />
                      <SummaryRow label="Receita total" value={formatCurrency(totalRevenue)} strong />
                    </section>

                    <section className="rounded-[var(--radius-sm)] bg-bg-secondary p-4">
                      <p className="mb-2 text-small font-medium text-text-primary">Custos</p>
                      <SummaryRow label="Custo do evento" value={formatCurrency(parsed.eventCost)} />
                      <SummaryRow label="Custo do bar" value={formatCurrency(parsed.barProductCost)} />
                      <SummaryRow label="Custos totais" value={formatCurrency(totalCosts)} strong />
                    </section>

                    <section
                      className={cn(
                        "rounded-[var(--radius-sm)] p-4",
                        netResult >= 0 ? "bg-accent-muted" : "bg-error-muted",
                      )}
                    >
                      <p className="mb-1 text-small text-text-secondary">Resultado líquido</p>
                      <p
                        className={cn(
                          "break-words text-heading-1",
                          netResult >= 0 ? "text-accent-text" : "text-error-text",
                        )}
                      >
                        {formatCurrency(netResult)}
                      </p>
                      <p className="mt-1 text-small text-text-secondary">
                        Margem {margin.toFixed(1)}%
                      </p>
                    </section>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricPreview label="Ticket médio" value={formatCurrency(ticketAverage)} />
                    <MetricPreview
                      label="Consumo médio"
                      value={formatCurrency(consumptionAverage)}
                      description="bar ÷ público presente"
                    />
                    <MetricPreview label="Venda antecipada" value={presaleShare.toFixed(0) + "%"} />
                    <MetricPreview
                      label="Cortesias"
                      value={courtesyShare.toFixed(0) + "%"}
                      description="presentes ÷ público presente"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="closure-notes">
                      Observações do produtor
                    </label>
                    <textarea
                      id="closure-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      className={cn(inputClass, "resize-none")}
                      placeholder="Anote o que for importante para consultar depois..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-bg-primary px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={step === 1 ? onClose : previousStep}
            disabled={closeMutation.isPending}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-body text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
          >
            {step === 1 ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {step === 1 ? "Cancelar" : "Voltar"}
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-5 py-2.5 text-body font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-accent-hover"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={closeMutation.isPending || !canFinish}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-5 py-2.5 text-body font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {closeMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Finalizar encerramento
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
