import { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatName, isFullName, maskWhatsApp, onlyDigits } from '@/lib/form-format';
import { useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Copy, CheckCircle2, Clock, Loader2, User, Phone } from 'lucide-react';
import { SmartField } from '@/components/ui/smart-field';
import { usePublicEvent, useApplyPublicDesign, useAvailableBatches } from '@/lib/customer-queries';
import { useCreatePendingSale, useTrackAbandonment, useGenerateSalePix, useSaleStatus } from '@/lib/sales-queries';
import { supabase } from '@/integrations/supabase/client';
import { setLastVisitedOrg } from '@/lib/org-context';
import { captureRef, getStoredRef } from '@/lib/attribution';

const checkoutSchema = z.object({
  buyerName: z.string().min(1, "Nome obrigatório").refine(isFullName, "Digite seu nome completo (mínimo 2 palavras)"),
  buyerWhatsApp: z.string().min(1, "WhatsApp obrigatório").refine(val => val.replace(/\D/g, "").length >= 11, "WhatsApp inválido"),
  participants: z.array(z.object({
    name: z.string().min(1, "Nome do participante obrigatório").refine(isFullName, "Nome completo obrigatório")
  }))
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const { slug } = useParams({ from: '/e/$slug/checkout' });
  const search = useSearch({ from: '/e/$slug/checkout' }) as { batchId?: string, qty?: string, ref?: string };
  const qtyInput = parseInt(search.qty || '1');
  const qty = isNaN(qtyInput) ? 1 : qtyInput;
  
  const { data: event, isLoading: isLoadingEvent } = usePublicEvent(slug);
  const { data: availableBatches } = useAvailableBatches(event?.id);
  useApplyPublicDesign(slug);
  const createPendingSale = useCreatePendingSale();
  const generateSalePix = useGenerateSalePix();
  const trackAbandonment = useTrackAbandonment();
  
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [countdown, setCountdown] = useState(1800);
  const [pixCopied, setPixCopied] = useState(false);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [currentSaleCode, setCurrentSaleCode] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  
  const { data: saleStatus } = useSaleStatus(currentSaleId);
  
  const navigate = useNavigate();
  const abandonmentTracked = useRef(false);

  const batch = availableBatches?.find(b => b.id === search.batchId) || availableBatches?.[0];

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      buyerName: '',
      buyerWhatsApp: '',
      participants: Array(qty).fill({ name: '' })
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "participants"
  });

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
    if (event?.organization_id) {
      setLastVisitedOrg(event.organization_id);
    }
  }, [event?.organization_id]);

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

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!event || !batch || isCreatingSale) return;
    
    setIsCreatingSale(true);
    setPixData(null);
    try {
      let customerId: string | undefined;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: customerData } = await supabase.rpc('get_or_create_customer', { 
          _organization_id: event.organization_id 
        });
        if (customerData) {
          customerId = customerData as string;
        }
      }

      const saleResult = await createPendingSale({
        event_id: event.id,
        batch_id: batch.id,
        buyer_name: values.buyerName,
        buyer_whatsapp: values.buyerWhatsApp,
        buyer_email: "",
        quantity: qty,
        participant_names: values.participants.map(p => p.name),
        customer_id: customerId as any,
        ref_code: getStoredRef(event.id) ?? undefined
      });

      const resultArr = saleResult as any[];
      const { sale_id: id, sale_code } = resultArr[0];
      setCurrentSaleId(id);
      setCurrentSaleCode(sale_code);

      try {
        const pixResult = await generateSalePix({ sale_id: id });
        setPixData({
          qr_code: pixResult.qr_code,
          qr_code_base64: pixResult.qr_code_base64
        });
      } catch (pixErr: any) {
        toast.error("Erro ao gerar o Pix. Por favor, tente novamente.");
        setIsCreatingSale(false);
        return;
      }
      
      setCountdown(1800);
      setStep('payment');
      window.scrollTo(0, 0);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar reserva. Tente novamente.");
    } finally {
      setIsCreatingSale(false);
    }
  };

  useEffect(() => {
    if (saleStatus === 'pago' && event && currentSaleCode) {
      toast.success("Pagamento confirmado com sucesso!");
      navigate({ to: `/e/${event.slug}/confirmacao/${currentSaleCode}` });
    }
  }, [saleStatus, event, currentSaleCode, navigate]);

  const handleSameAsBuyer = (checked: boolean | 'indeterminate') => {
    if (checked === true && qty === 1) {
      form.setValue('participants.0.name', form.getValues('buyerName'));
    }
  };

  const copyPix = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.qr_code);
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
                <SmartField label="Nome completo" icon={User} value={form.watch('buyerName')} onChange={(v) => form.setValue('buyerName', formatName(v), { shouldValidate: true })} isValid={isFullName(form.watch('buyerName'))} placeholder="Seu nome" error={form.formState.errors.buyerName?.message as string} />
                <SmartField label="WhatsApp" icon={Phone} value={form.watch('buyerWhatsApp')} onChange={(v) => form.setValue('buyerWhatsApp', maskWhatsApp(v), { shouldValidate: true })} isValid={onlyDigits(form.watch('buyerWhatsApp')).length === 11} placeholder="(00) 00000-0000" inputMode="tel" error={form.formState.errors.buyerWhatsApp?.message as string} />
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
              <div className="bg-white p-4 rounded-xl shadow-sm min-h-[232px] min-w-[232px] flex items-center justify-center">
                {pixData ? (
                  <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="h-[200px] w-[200px]" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
                )}
              </div>
              <div className="flex w-full flex-col gap-3">
                <Button 
                  variant="outline" 
                  disabled={countdown === 0 || !pixData}
                  className="flex h-12 w-full items-center justify-between border-[var(--border-default)] px-4 disabled:opacity-50"
                  onClick={copyPix}
                >
                  <span className="truncate pr-4 text-xs font-mono text-[var(--text-secondary)]">
                    {pixData ? pixData.qr_code.substring(0, 30) : "Gerando código..."}...
                  </span>
                  {pixCopied ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
                </Button>
                <p className="text-center text-xs text-[var(--text-secondary)]">Copie o código acima e pague no app do seu banco</p>
              </div>
            </div>

          </div>
        )}

      </div>
    </MobileLayout>
  );
}
