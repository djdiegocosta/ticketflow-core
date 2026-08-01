import { useMemo, useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { EVENTS, formatCurrency, type Sale } from "@/lib/sales-data";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const inputClass =
  "w-full border border-border-default bg-bg-secondary px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent";
const labelClass = "mb-2 block text-small text-text-secondary";
const errorClass = "mt-1 text-small text-error";
const blockTitle = "text-micro uppercase tracking-wide text-text-secondary";

type Errors = Record<string, string>;

export function ManualSaleModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (sale: Sale) => void;
}) {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState(EVENTS[0]!.id);
  const [lotId, setLotId] = useState(EVENTS[0]!.lots[0]!.id);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix manual");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const event = useMemo(() => EVENTS.find((e) => e.id === eventId)!, [eventId]);
  const lot = useMemo(
    () => event.lots.find((l) => l.id === lotId) ?? event.lots[0]!,
    [event, lotId],
  );

  // Lote depende do evento selecionado
  useEffect(() => {
    setLotId(event.lots[0]!.id);
  }, [event]);

  // Campos de participante seguem a quantidade digitada
  useEffect(() => {
    setParticipants((prev) => {
      const next = [...prev];
      next.length = Math.max(1, quantity);
      return next.map((v) => v ?? "");
    });
  }, [quantity]);

  // Valor pré-preenchido: preço do lote × quantidade
  useEffect(() => {
    setAmount(String((lot.price * Math.max(1, quantity)).toFixed(2)).replace(".", ","));
  }, [lot, quantity]);

  useEffect(() => {
    if (sameAsBuyer && quantity === 1) setParticipants([formatName(buyerName)]);
  }, [sameAsBuyer, buyerName, quantity]);

  // Se fechar e tiver dados, pedir confirmação? O prompt diz "com confirmação se já houver dados preenchidos"
  const handleClose = () => {
    const hasData = buyerName || buyerWhatsapp || note || participants.some(p => p !== "");
    if (hasData) {
      if (confirm("Deseja descartar as informações preenchidas?")) {
        reset();
        onClose();
      }
    } else {
      reset();
      onClose();
    }
  };

  const reset = () => {
    setStep(1);
    setBuyerName("");
    setBuyerWhatsapp("");
    setQuantity(1);
    setParticipants([""]);
    setSameAsBuyer(false);
    setPaymentMethod("Pix manual");
    setNote("");
    setErrors({});
  };

  const validateStep = (s: number) => {
    const next: Errors = {};
    if (s === 1) {
      if (!buyerName.trim()) next["buyerName"] = "Nome do comprador obrigatório";
      else if (!isFullName(buyerName)) next["buyerName"] = "Informe nome e sobrenome (mínimo 2 palavras)";
      if (onlyDigits(buyerWhatsapp).length < 11) next["buyerWhatsapp"] = "WhatsApp deve ter 11 dígitos";
    } else if (s === 2) {
      if (quantity < 1) next["quantity"] = "Quantidade mínima: 1";
      participants.slice(0, quantity).forEach((name, i) => {
        if (!name?.trim()) next[`p${i}`] = "Nome do participante obrigatório";
        else if (!isFullName(name)) next[`p${i}`] = "Informe nome e sobrenome (mínimo 2 palavras)";
      });
    } else if (s === 3) {
      const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) next["amount"] = "Valor inválido";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const submit = () => {
    if (!validateStep(3)) return;

    const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    const seq = Math.floor(1000 + Math.random() * 8999);
    const sale: Sale = {
      id: String(seq),
      buyerName: formatName(buyerName),
      buyerWhatsapp,
      eventName: event.name,
      lotName: lot.name,
      origin: "Manual",
      quantity,
      amount: parsedAmount,
      status: "Pago",
      createdAt: new Date().toLocaleString("pt-BR"),
      paymentMethod,
      ...(note ? { note } : {}),
      tickets: participants.slice(0, quantity).map((name, i) => ({
        code: `TF-M${seq}-${String(i + 1).padStart(4, "0")}`,
        participantName: formatName(name),
        checkedIn: false,
      })),
    };

    onCreate(sale);
    toast.success(`Venda registrada — ${quantity} ingresso(s) gerado(s)`);
    reset();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-bg-primary shadow-lg transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-heading-2 text-text-primary">Nova Venda</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="shrink-0 px-6 py-4 border-b border-border-subtle">
          <div className="mb-2 h-1 w-full bg-bg-tertiary">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-micro font-medium">
            <span className={step >= 1 ? "text-text-primary" : "text-text-secondary"}>1. Cliente</span>
            <span className={step >= 2 ? "text-text-primary" : "text-text-secondary"}>2. Ingressos</span>
            <span className={step >= 3 ? "text-text-primary" : "text-text-secondary"}>3. Confirmar</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="space-y-6">
              <section className="space-y-4">
                <p className={blockTitle}>Evento</p>
                <div>
                  <label className={labelClass}>Evento</label>
                  <select
                    className={inputClass}
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    {EVENTS.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Lote</label>
                  <select
                    className={inputClass}
                    value={lotId}
                    onChange={(e) => setLotId(e.target.value)}
                  >
                    {event.lots.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {formatCurrency(l.price)}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <p className={blockTitle}>Comprador</p>
                <div>
                  <label className={labelClass}>Nome completo</label>
                  <input
                    className={inputClass}
                    placeholder="Nome Sobrenome"
                    value={buyerName}
                    onChange={(e) => setBuyerName(formatName(e.target.value))}
                  />
                  {errors["buyerName"] && <p className={errorClass}>{errors["buyerName"]}</p>}
                </div>
                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <input
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(maskWhatsApp(e.target.value))}
                  />
                  {errors["buyerWhatsapp"] && <p className={errorClass}>{errors["buyerWhatsapp"]}</p>}
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <section className="space-y-4">
                <p className={blockTitle}>Quantidade e participantes</p>
                <div>
                  <label className={labelClass}>Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                  {errors["quantity"] && <p className={errorClass}>{errors["quantity"]}</p>}
                </div>

                {quantity === 1 && (
                  <label className="flex items-center gap-2 text-small text-text-secondary">
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={sameAsBuyer}
                      onChange={(e) => setSameAsBuyer(e.target.checked)}
                    />
                    Mesmo nome do comprador
                  </label>
                )}

                {Array.from({ length: quantity }).map((_, i) => (
                  <div key={i}>
                    <label className={labelClass}>Nome do participante #{i + 1}</label>
                    <input
                      className={inputClass}
                      placeholder="Nome Sobrenome"
                      disabled={sameAsBuyer && quantity === 1}
                      value={participants[i] ?? ""}
                      onChange={(e) => {
                        const value = formatName(e.target.value);
                        setParticipants((prev) => {
                          const next = [...prev];
                          next[i] = value;
                          return next;
                        });
                      }}
                    />
                    {errors[`p${i}`] && <p className={errorClass}>{errors[`p${i}`]}</p>}
                  </div>
                ))}
              </section>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <section className="space-y-4">
                <p className={blockTitle}>Resumo da Venda</p>
                <div className="space-y-2 rounded-none border border-border-subtle bg-bg-secondary p-4 text-small">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Evento:</span>
                    <span className="font-medium text-text-primary">{event.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Lote:</span>
                    <span className="font-medium text-text-primary">{lot.name}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-subtle pt-2">
                    <span className="text-text-secondary">Comprador:</span>
                    <span className="font-medium text-text-primary">{buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Quantidade:</span>
                    <span className="font-medium text-text-primary">{quantity}x</span>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <p className={blockTitle}>Pagamento</p>
                <div>
                  <label className={labelClass}>Valor pago (R$)</label>
                  <input
                    className={inputClass}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {errors["amount"] && <p className={errorClass}>{errors["amount"]}</p>}
                </div>
                <div>
                  <label className={labelClass}>Forma de pagamento</label>
                  <select
                    className={inputClass}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {["Pix manual", "Dinheiro", "Cartão", "Outro"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Observação (opcional)</label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border-subtle px-6 py-4 bg-bg-primary">
          <button
            type="button"
            onClick={handleClose}
            className="text-body text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1 border border-border-default px-4 py-2 text-body text-text-primary hover:bg-bg-tertiary"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1 bg-accent px-5 py-2 text-body font-semibold text-[#111111] hover:bg-accent-hover"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                className="bg-accent px-5 py-2 text-body font-semibold text-[#111111] hover:bg-accent-hover"
              >
                Registrar venda
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
