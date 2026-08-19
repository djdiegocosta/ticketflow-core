import { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatName, isFullName, maskWhatsApp, onlyDigits } from '@/lib/form-format';
import { useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { getUFByDDD } from '@/lib/ibge-data';
import { usePublicEvent } from '@/lib/customer-queries';
import { useCreatePendingSale, useConfirmSalePaid, useTrackAbandonment } from '@/lib/sales-queries';

const checkoutSchema = z.object({
  buyerName: z.string().min(1, "Nome obrigatório").refine(isFullName, "Digite seu nome completo (mínimo 2 palavras)"),
  buyerWhatsApp: z.string().min(1, "WhatsApp obrigatório").refine(val => val.replace(/\D/g, "").length >= 11, "WhatsApp inválido"),
  buyerEmail: z.string().email("E-mail inválido").optional().or(z.literal('')),
  buyerCity: z.string().optional(),
  participants: z.array(z.object({
    name: z.string().min(1, "Nome do participante obrigatório").refine(isFullName, "Nome completo obrigatório")
  }))
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const { slug } = useParams({ from: '/e/$slug/checkout' });
  const search = useSearch({ from: '/e/$slug/checkout' }) as { batchId?: string, qty?: string };
  const qtyInput = parseInt(search.qty || '1');
  const qty = isNaN(qtyInput) ? 1 : qtyInput;
  
  const { data: event, isLoading: isLoadingEvent } = usePublicEvent(slug);
  const createPendingSale = useCreatePendingSale();
  const confirmSalePaid = useConfirmSalePaid();
  const trackAbandonment = useTrackAbandonment();
  
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [countdown, setCountdown] = useState(1800);
  const [pixCopied, setPixCopied] = useState(false);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [currentSaleCode, setCurrentSaleCode] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const abandonmentTracked = useRef(false);

  const batch = event?.ticket_batches?.find(b => b.id === search.batchId) || event?.ticket_batches?.[0];

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      buyerName: '',
      buyerWhatsApp: '',
      buyerEmail: '',
      buyerCity: '',
      participants: Array(qty).fill({ name: '' })
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  // Tracking de abandono ao desmontar se preencheu algo mas não gerou venda
  useEffect(() => {
    return () => {
      const data = form.getValues();
      if (
        event?.id && 
        !currentSaleId && 
        !abandonmentTracked.current && 
        data.buyerName.length > 3 && 
        onlyDigits(data.buyerWhatsApp).length >= 10
      ) {
        trackAbandonment({
          event_id: event.id,
          buyer_name: data.buyerName,
          buyer_whatsapp: data.buyerWhatsApp
        });
        abandonmentTracked.current = true;
      }
    };
  }, [event?.id, currentSaleId, form, trackAbandonment]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'payment') {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  useEffect(() => {
    if (countdown === 0 && step === 'payment') {
      toast.error("O tempo para pagamento expirou. O estoque foi liberado.", { duration: 5000 });
      setStep('info');
      setCurrentSaleId(null);
      setCurrentSaleCode(null);
    }
  }, [countdown, step]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!event || !batch || isCreatingSale) return;
    
    setIsCreatingSale(true);
    try {
      const saleResult = await createPendingSale({
        event_id: event.id,
        batch_id: batch.id,
        buyer_name: data.buyerName,
        buyer_whatsapp: data.buyerWhatsApp,
        buyer_email: data.buyerEmail || "",
        quantity: qty,
        participant_names: data.participants.map(p => p.name)
      });

      const resultArr = saleResult as any[];
      const { sale_id: id, sale_code, total_amount } = resultArr[0];
      setCurrentSaleId(id);
      setCurrentSaleCode(sale_code);
      
      // Reset countdown to 30 minutes (1800 seconds)
      setCountdown(1800);
      setStep('payment');
      window.scrollTo(0, 0);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar reserva. Tente novamente.");
    } finally {
      setIsCreatingSale(false);
    }
  };

  const simulatePayment = async () => {
    if (!currentSaleId || !currentSaleCode || !event || isConfirmingPayment) return;

    setIsConfirmingPayment(true);
    try {
      await confirmSalePaid(currentSaleId);
      toast.success("Pagamento confirmado com sucesso!");
      navigate({ to: `/e/${event.slug}/confirmacao/${currentSaleCode}` });
    } catch (err: any) {
      toast.error("Erro ao confirmar pagamento simulado: " + err.message);
    } finally {
      setIsConfirmingPayment(false);
    }
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

  if (isLoadingEvent) {
    return (
      <MobileLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Checkout</div>}>
      <div className="flex flex-col gap-6 px-5 py-6 pb-32 safe-area-bottom">
        
        {/* Resumo do Pedido */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-small text-[var(--text-secondary)]">Você está comprando</span>
            <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">{event?.title}</h2>
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
                <div className="space-y-2">
                  <Label>Cidade (opcional)</Label>
                  <Controller
                    name="buyerCity"
                    control={form.control}
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value || ""}
                        onChange={field.onChange}
                        uf={getUFByDDD(onlyDigits(form.watch("buyerWhatsApp")))}
                      />
                    )}
                  />
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
              disabled={isCreatingSale}
              className="mt-4 h-14 w-full bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingSale ? <Loader2 className="h-6 w-6 animate-spin" /> : "Gerar Pix"}
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
                  disabled={countdown === 0}
                  className="flex h-12 w-full items-center justify-between border-[var(--border-default)] px-4 disabled:opacity-50"
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
                  disabled={isConfirmingPayment || countdown === 0}
                  className="w-full bg-[var(--accent)] text-[#111111] hover:bg-[var(--accent-hover)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isConfirmingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      Simular Pagamento Confirmado
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
