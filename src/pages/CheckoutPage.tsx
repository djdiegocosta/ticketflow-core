import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatName, isFullName, maskWhatsApp } from '@/lib/form-format';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { usePublicData } from '@/lib/public-data';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const checkoutSchema = z.object({
  buyerName: z.string().min(1, "Nome obrigatório").refine(isFullName, "Digite seu nome completo (mínimo 2 palavras)"),
  buyerWhatsApp: z.string().min(1, "WhatsApp obrigatório").refine(val => val.replace(/\D/g, "").length >= 11, "WhatsApp inválido"),
  buyerEmail: z.string().email("E-mail inválido").optional().or(z.literal('')),
  participants: z.array(z.object({
    name: z.string().min(1, "Nome do participante obrigatório").refine(isFullName, "Nome completo obrigatório")
  }))
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const EVENT = {
  name: 'Festa de Verão',
  slug: 'festa-de-verao',
  date: '20 de Dezembro, 22:00',
  location: 'Arena Praia, Guarujá',
  batches: [
    { id: 'b1', name: 'Lote 01 - Promo', price: 120 },
    { id: 'b2', name: 'Lote 02', price: 150 }
  ]
};

export default function CheckoutPage() {
  const search = useSearch({ from: '/e/$slug/checkout' }) as { batchId: string, qty: string };
  const qtyInput = parseInt(search.qty || '1');
  const qty = isNaN(qtyInput) ? 1 : qtyInput;
  const batch = EVENT.batches.find(b => b.id === search.batchId) || EVENT.batches[0];
  
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [countdown, setCountdown] = useState(1800);
  const [pixCopied, setPixCopied] = useState(false);
  
  const navigate = useNavigate();
  const { addSale } = usePublicData();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      buyerName: '',
      buyerWhatsApp: '',
      buyerEmail: '',
      participants: Array(qty).fill({ name: '' })
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'payment') {
      timer = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = (data: CheckoutFormValues) => {
    console.log("Submitting:", data);
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const simulatePayment = () => {
    const data = form.getValues();
    const newSaleCode = `TF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSale = {
      id: Math.random().toString(36).substring(7),
      sale_code: newSaleCode,
      event_slug: EVENT.slug,
      event_name: EVENT.name,
      event_date: EVENT.date,
      amount_paid: (batch?.price || 0) * qty,
      quantity: qty,
      status: 'pago' as const,
      tickets: data.participants.map((p, i) => ({
        id: Math.random().toString(36).substring(7),
        ticket_code: `TKT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${i}`,
        participant_name: p.name,
        event_name: EVENT.name,
        event_date: EVENT.date,
        event_location: EVENT.location,
        status: 'Válido' as const
      }))
    };

    addSale(newSale);
    toast.success("Pagamento confirmado com sucesso!");
    navigate({ to: `/e/${EVENT.slug}/confirmacao/${newSaleCode}` });
  };

  const handleSameAsBuyer = (checked: boolean | 'indeterminate') => {
    if (checked === true && qty === 1) {
      form.setValue('participants.0.name', form.getValues('buyerName'));
    }
  };

  const pixKey = "00020126580014BR.GOV.BCB.PIX0136629a9b92-2d82-42e6-a83d-1a1a1a1a1a1a520400005303986540510.005802BR5913TICKETFLOW SA6008SAO PAULO62070503***6304E2D8";

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setPixCopied(false), 2000);
  };

  return (
    <MobileLayout headerContent={<div className="text-center font-semibold text-small">Checkout</div>}>
      <div className="flex flex-col gap-6 px-5 py-6">
        
        {/* Resumo do Pedido */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-small text-[var(--text-secondary)]">Você está comprando</span>
            <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">{EVENT.name}</h2>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
              <span className="text-small text-[var(--text-secondary)]">{qty}x {batch?.name}</span>
              <span className="font-bold text-[var(--text-primary)]">R$ {((batch?.price || 0) * qty).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {step === 'info' && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Dados do comprador</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input 
                    placeholder="Seu nome"
                    {...form.register('buyerName')}
                    onInput={(e) => {
                      const t = e.target as HTMLInputElement;
                      t.value = formatName(t.value);
                      form.setValue('buyerName', t.value, { shouldValidate: true });
                    }}
                  />
                  {form.formState.errors.buyerName && <p className="text-xs text-error">{form.formState.errors.buyerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input 
                    placeholder="(00) 00000-0000"
                    {...form.register('buyerWhatsApp')}
                    onInput={(e) => {
                      const t = e.target as HTMLInputElement;
                      t.value = maskWhatsApp(t.value);
                      form.setValue('buyerWhatsApp', t.value, { shouldValidate: true });
                    }}
                  />
                  {form.formState.errors.buyerWhatsApp && <p className="text-xs text-error">{form.formState.errors.buyerWhatsApp.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>E-mail (opcional)</Label>
                  <Input placeholder="seu@email.com" {...form.register('buyerEmail')} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Participantes</h3>
                {qty === 1 && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="same" onCheckedChange={handleSameAsBuyer} />
                    <label htmlFor="same" className="text-xs text-[var(--text-secondary)]">Mesmo do comprador</label>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                    <Label>Nome do Participante {qty > 1 ? index + 1 : ''}</Label>
                    <Input 
                      placeholder="Nome Sobrenome"
                      {...form.register(`participants.${index}.name` as const)}
                      onInput={(e) => {
                        const t = e.target as HTMLInputElement;
                        t.value = formatName(t.value);
                        form.setValue(`participants.${index}.name`, t.value, { shouldValidate: true });
                      }}
                    />
                    {form.formState.errors.participants?.[index]?.name && <p className="text-xs text-error">{form.formState.errors.participants?.[index]?.name?.message}</p>}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              type="submit"
              className="mt-4 h-14 w-full bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)]"
            >
              Ir para o pagamento
            </Button>
          </form>
        )}

        {step === 'payment' && (
          <div className="flex flex-col gap-8 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                <Clock className="h-8 w-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">Aguardando Pagamento</h2>
                <p className="text-small text-[var(--text-secondary)]">O seu Pix expira em <span className="font-mono font-bold text-[var(--accent-text)]">{formatTime(countdown)}</span></p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 rounded-[var(--radius-lg)] border-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-6">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG value={pixKey} size={200} />
              </div>
              <div className="flex w-full flex-col gap-3">
                <Button 
                  variant="outline" 
                  className="flex h-12 w-full items-center justify-between border-[var(--border-default)] px-4"
                  onClick={copyPix}
                >
                  <span className="truncate pr-4 text-xs font-mono text-[var(--text-secondary)]">{pixKey.substring(0, 30)}...</span>
                  {pixCopied ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
                </Button>
                <p className="text-center text-xs text-[var(--text-secondary)]">Copie o código acima e pague no app do seu banco</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <div className="rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] p-4 border border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Modo de Teste</p>
                <Button 
                  onClick={simulatePayment}
                  className="w-full bg-[var(--accent)] text-[#111111] hover:bg-[var(--accent-hover)] flex items-center justify-center gap-2"
                >
                  Simular Pagamento Confirmado
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
