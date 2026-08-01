import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { EVENTS, formatCurrency, type Sale } from "@/lib/sales-data";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent";
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
  const [eventId, setEventId] = useState(EVENTS[0].id);
  const [lotId, setLotId] = useState(EVENTS[0].lots[0].id);
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
    () => event.lots.find((l) => l.id === lotId) ?? event.lots[0],
    [event, lotId],
  );

  // Lote depende do evento selecionado
  useEffect(() => {
    setLotId(event.lots[0].id);
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

  if (!open) return null;

  const reset = () => {
    setBuyerName("");
    setBuyerWhatsapp("");
    setQuantity(1);
    setParticipants([""]);
    setSameAsBuyer(false);
    setPaymentMethod("Pix manual");
    setNote("");
    setErrors({});
  };

  const submit = () => {
    const next: Errors = {};
    if (!buyerName.trim()) next.buyerName = "Nome do comprador obrigatório";
    else if (!isFullName(buyerName)) next.buyerName = "Informe nome e sobrenome (mínimo 2 palavras)";
    if (onlyDigits(buyerWhatsapp).length < 11) next.buyerWhatsapp = "WhatsApp deve ter 11 dígitos";
    if (quantity < 1) next.quantity = "Quantidade mínima: 1";
    participants.slice(0, quantity).forEach((name, i) => {
      if (!name?.trim()) next[`p${i}`] = "Nome do participante obrigatório";
      else if (!isFullName(name)) next[`p${i}`] = "Informe nome e sobrenome (mínimo 2 palavras)";
    });
    const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) next.amount = "Valor inválido";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

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
      note: note || undefined,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(0,0,0,0.45)] p-6">
      <div className="mt-6 w-full max-w-[480px] rounded-[var(--radius-lg)] border border-border-subtle bg-bg-primary shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-heading-2 text-text-primary">Lançar venda manual</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-[var(--radius-sm)] p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Bloco 1 */}
          <section className="space-y-3">
            <p className={blockTitle}>Evento</p>
            <div>
              <label className={labelClass} htmlFor="ms-event">
                Evento
              </label>
              <select
                id="ms-event"
                className={inputClass}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                {EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ms-lot">
                Lote
              </label>
              <select
                id="ms-lot"
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

          {/* Bloco 2 */}
          <section className="space-y-3">
            <p className={blockTitle}>Comprador</p>
            <div>
              <label className={labelClass} htmlFor="ms-buyer">
                Nome completo
              </label>
              <input
                id="ms-buyer"
                className={inputClass}
                placeholder="Nome Sobrenome"
                value={buyerName}
                onChange={(e) => setBuyerName(formatName(e.target.value))}
              />
              {errors.buyerName && <p className={errorClass}>{errors.buyerName}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="ms-whats">
                WhatsApp
              </label>
              <input
                id="ms-whats"
                className={inputClass}
                placeholder="(00) 00000-0000"
                value={buyerWhatsapp}
                onChange={(e) => setBuyerWhatsapp(maskWhatsApp(e.target.value))}
              />
              {errors.buyerWhatsapp && <p className={errorClass}>{errors.buyerWhatsapp}</p>}
            </div>
          </section>

          {/* Bloco 3 */}
          <section className="space-y-3">
            <p className={blockTitle}>Quantidade e participantes</p>
            <div>
              <label className={labelClass} htmlFor="ms-qty">
                Quantidade
              </label>
              <input
                id="ms-qty"
                type="number"
                min={1}
                className={inputClass}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              {errors.quantity && <p className={errorClass}>{errors.quantity}</p>}
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
                <label className={labelClass} htmlFor={`ms-p-${i}`}>
                  Nome do participante #{i + 1}
                </label>
                <input
                  id={`ms-p-${i}`}
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

          {/* Bloco 4 */}
          <section className="space-y-3">
            <p className={blockTitle}>Pagamento</p>
            <div>
              <label className={labelClass} htmlFor="ms-amount">
                Valor pago (R$)
              </label>
              <input
                id="ms-amount"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && <p className={errorClass}>{errors.amount}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="ms-pay">
                Forma de pagamento
              </label>
              <select
                id="ms-pay"
                className={inputClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {["Pix manual", "Dinheiro", "Cartão", "Outro"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ms-note">
                Observação (opcional)
              </label>
              <textarea
                id="ms-note"
                rows={3}
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-border-subtle px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] border border-border-default bg-bg-tertiary px-5 py-2.5 text-body text-text-primary transition-colors hover:border-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-[var(--radius-sm)] bg-accent px-5 py-2.5 text-body font-semibold text-[#111111] transition-colors hover:bg-accent-hover"
          >
            Registrar venda
          </button>
        </div>
      </div>
    </div>
  );
}
