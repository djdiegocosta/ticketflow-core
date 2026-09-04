import { useMemo, useState, useEffect } from "react";
import { channelLabel, useSalesLinks } from "@/lib/sales-links-queries";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/sales-queries";
import { useEvents } from "@/lib/events-queries";
import { supabase } from "@/integrations/supabase/client";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { toast } from "sonner";

import {
  PanelCancelButton,
  PanelPrimaryButton,
  PanelSecondaryButton,
  SidePanel,
  panelErrorClass as errorClass,
  panelInputClass as inputClass,
  panelLabelClass as labelClass,
} from "@/components/admin/SidePanel";

const blockTitle = "text-micro uppercase tracking-wide text-text-secondary";

type Errors = Record<string, string>;

export function ManualSaleModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { data: eventsQuery = [] } = useEvents();
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState("");
  const [lotId, setLotId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix manual");
  const [note, setNote] = useState("");
  const [salesLinkId, setSalesLinkId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const event = useMemo(() => eventsQuery.find((e) => e.id === eventId), [eventsQuery, eventId]);
  
  const [eventWithBatches, setEventWithBatches] = useState<any>(null);
  const { data: salesLinks = [] } = useSalesLinks(eventId || null);
  const activeSalesLinks = salesLinks.filter((l) => l.is_active);

  useEffect(() => {
    if (eventId) {
      supabase.from("ticket_batches").select("*").eq("event_id", eventId).order("created_at")
        .then(({ data }) => setEventWithBatches(data));
    }
  }, [eventId]);

  const lots = eventWithBatches || [];
  const lot = useMemo(() => {
    if (lots.length === 0) return null;
    return lots.find((l: any) => l.id === lotId) || lots[0];
  }, [lots, lotId]);

  useEffect(() => {
    if (eventsQuery?.length > 0 && !eventId) {
      const firstEvent = eventsQuery[0];
      if (firstEvent) setEventId(firstEvent.id);
    }
  }, [eventsQuery, eventId]);

  useEffect(() => {
    if (lots.length > 0) {
      setLotId(lots[0].id);
    }
  }, [lots]);

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
    if (lot) {
      const price = (lot as any).price || 0;
      setAmount(String((price * Math.max(1, quantity)).toFixed(2)).replace(".", ","));
    }
  }, [lot, quantity]);

  useEffect(() => {
    if (sameAsBuyer && quantity === 1) setParticipants([formatName(buyerName)]);
  }, [sameAsBuyer, buyerName, quantity]);

  // Se fechar e tiver dados, pedir confirmação
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
    setSalesLinkId("");
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

  const submit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    
    // Mapeamento de métodos de pagamento para o enum do Supabase
    const methodMap: Record<string, any> = {
      "Pix manual": "pix_manual",
      "Dinheiro": "dinheiro",
      "Cartão": "cartao",
      "Outro": "outro"
    };

    const { error } = await supabase.rpc('create_manual_sale', {
      _event_id: eventId,
      _batch_id: lotId,
      _buyer_name: formatName(buyerName),
      _buyer_whatsapp: buyerWhatsapp,
      _quantity: quantity,
      _participant_names: participants.slice(0, quantity).map(n => formatName(n)),
      _total_amount: parsedAmount,
      _payment_method: methodMap[paymentMethod] || "outro",
      _observation: note,
      ...(salesLinkId ? { _sales_link_id: salesLinkId } : {}),
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao registrar venda: " + error.message);
      return;
    }

    onCreate();
    toast.success(`Venda registrada — ${quantity} ingresso(s) gerado(s)`);
    reset();
    onClose();
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Nova Venda"
      steps={["Cliente", "Ingressos", "Confirmar"]}
      currentStep={step}
      footer={
        <>
          <PanelCancelButton onClick={handleClose} />
          <div className="flex gap-3">
            {step > 1 && (
              <PanelSecondaryButton onClick={prevStep}>
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </PanelSecondaryButton>
            )}
            {step < 3 ? (
              <PanelPrimaryButton onClick={nextStep}>
                Continuar
                <ChevronRight className="h-4 w-4" />
              </PanelPrimaryButton>
            ) : (
              <PanelPrimaryButton onClick={submit} disabled={loading}>
                {loading ? "Registrando..." : "Registrar venda"}
              </PanelPrimaryButton>
            )}
          </div>
        </>
      }
    >
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
                    {eventsQuery.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
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
                    {lots.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {formatCurrency((l as any).price || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Vendido via (opcional)</label>
                  <select
                    className={inputClass}
                    value={salesLinkId}
                    onChange={(e) => setSalesLinkId(e.target.value)}
                  >
                    <option value="">Sem canal informado</option>
                    {activeSalesLinks.map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.name} — {channelLabel(link.channel)}
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
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.value = formatName(target.value);
                      setBuyerName(target.value);
                    }}
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
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        target.value = formatName(target.value);
                        const value = target.value;
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
                <div className="space-y-2 rounded-[var(--radius-sm)] border border-border-subtle bg-bg-secondary p-4 text-small">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Evento:</span>
                    <span className="font-medium text-text-primary">{(event as any)?.title || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Lote:</span>
                    <span className="font-medium text-text-primary">{lot?.name || "—"}</span>
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
    </SidePanel>
  );
}
