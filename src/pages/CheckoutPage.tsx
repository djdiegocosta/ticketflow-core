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
import { useNavigate, useSearch, useParams, Link } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Copy, CheckCircle2, Clock, Loader2, User, Phone, Mail, RefreshCw } from 'lucide-react';
import { SmartField } from '@/components/ui/smart-field';
import { usePublicEvent, useApplyPublicDesign, useAvailableBatches, useMyCustomerRecords } from '@/lib/customer-queries';
import { useCreatePendingSale, useTrackAbandonment, useGenerateSalePix, useSaleStatus } from '@/lib/sales-queries';
import { useAuth } from '@/lib/auth-context';
import { buildCheckoutPrefill } from '@/lib/checkout-prefill';
import { supabase } from '@/integrations/supabase/client';
import { setLastVisitedOrg } from '@/lib/org-context';
import { captureRef, getStoredRef } from '@/lib/attribution';

const checkoutSchema = z.object({
  buyerName: z.string().min(1, "Nome obrigatório").refine(isFullName, "Digite seu nome completo (mínimo 2 palavras)"),
  buyerWhatsApp: z.string().min(1, "WhatsApp obrigatório").refine(val => val.replace(/\D/g, "").length >= 11, "WhatsApp inválido"),
  buyerEmail: z.string().min(1, "E-mail obrigatório").email("Digite um e-mail válido"),
  participants: z.array(z.object({
    name: z.string().min(1, "Nome do participante obrigatório").refine(isFullName, "Nome completo obrigatório")
  }))
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const { slug } = useParams({ from: '/e/$slug/checkout' });
  const search = useSearch({ from: '/e/$slug/checkout' }) as { batchId?: string, qty?: string, ref?: string, resume?: string };
  const qtyInput = parseInt(search.qty || '1');
  const qty = isNaN(qtyInput) ? 1 : qtyInput;
  
  const { user } = useAuth();
  const { data: event, isLoading: isLoadingEvent } = usePublicEvent(slug);
  const { data: availableBatches } = useAvailableBatches(event?.id);
  const { data: customerRecords } = useMyCustomerRecords();
  useApplyPublicDesign(slug);
  const createPendingSale = useCreatePendingSale();
  const generateSalePix = useGenerateSalePix();
  const trackAbandonment = useTrackAbandonment();
  
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [countdown, setCountdown] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [currentSaleCode, setCurrentSaleCode] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  
  const { data: saleStatus, refetch: refetchSaleStatus, isFetching: isCheckingPayment } = useSaleStatus(currentSaleId);
  const [isResuming, setIsResuming] = useState(!!search.resume);
  
  const navigate = useNavigate();
  const abandonmentTracked = useRef(false);
  const prefillAppliedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!search.resume) return;
    let cancelled = false;
    (async () => {
      const { data: sale, error } = await supabase
        .from('sales')
        .select('id, sale_code, status, expires_at, mp_qr_code, mp_qr_code_base64')
        .eq('id', search.resume)
        .maybeSingle();

      if (cancelled) return;

      if (error || !sale || sale.status !== 'pendente' || !sale.mp_qr_code || (sale.expires_at && new Date(sale.expires_at) <= new Date())) {
        toast.error("Essa reserva não está mais disponível.");
        navigate({ to: '/e/$slug', params: { slug }, replace: true });
        return;
      }

      setCurrentSaleId(sale.id);
      setCurrentSaleCode(sale.sale_code);
      setExpiresAt(sale.expires_at);
      setPixData({ qr_code: sale.mp_qr_code, qr_code_base64: sale.mp_qr_code_base64 });
      setStep('payment');
      setIsResuming(false);
    })();
    return () => { cancelled = true; };
  }, [search.resume, navigate, slug]);

  const batch = availableBatches?.find(b => b.id === search.batchId) || availableBatches?.[0];

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
    if (!user || !event || !customerRecords) return;

    const customer = customerRecords.find((record) => record.organization_id === event.organization_id) ?? null;
    const key = `${user.id}:${event.id}:${customer?.id ?? 'no-customer'}`;
    if (prefillAppliedKey.current === key) return;

    const prefill = buildCheckoutPrefill(customer, user.email);
    const setIfPristine = (field: keyof CheckoutFormValues, value?: string) => {
      if (value && !form.getFieldState(field).isDirty) {
        form.setValue(field, value, { shouldValidate: true });
      }
    };

    setIfPristine('buyerName', prefill.buyerName);
    setIfPristine('buyerWhatsApp', prefill.buyerWhatsApp ? maskWhatsApp(prefill.buyerWhatsApp) : undefined);
    setIfPristine('buyerEmail', prefill.buyerEmail?.toLowerCase());
    prefillAppliedKey.current = key;
  }, [user, event, customerRecords, form]);

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
    if (event?.id) captureRef(event.id, search.ref);
  }, [event?.id, search.ref]);

  useEffect(() => {
    if (step !== 'payment' || !expiresAt) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [step, expiresAt]);

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
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
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
        buyer_email: values.buyerEmail,
        quantity: qty,
        participant_names: values.participants.map(p => p.name),
        customer_id: customerId as any,
        ...(getStoredRef(event.id) ? { ref_code: getStoredRef(event.id) as string } : {}),
      });

      const resultArr = saleResult as any[];
      const { sale_id: id, sale_code, expires_at } = resultArr[0];
      setCurrentSaleId(id);
      setCurrentSaleCode(sale_code);
      setExpiresAt(expires_at);

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
      return;
    }

    if (saleStatus === 'expirado' && step === 'payment') {
      toast.error("O tempo para pagamento expirou. O estoque foi liberado.", { duration: 5000 });
      setStep('info');
      setCurrentSaleId(null);
      setCurrentSaleCode(null);
      setExpiresAt(null);
      setCountdown(0);
      setPixData(null);
    }
  }, [saleStatus, event, currentSaleCode, navigate, step]);

  const handleSameAsBuyer = (checked: boolean | 'indeterminate') => {
    if (checked === true && qty === 1) {
      form.setValue('participants.0.name', form.getValues('buyerName'));
    }
  };

  const copyPix = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setPixCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
    }
  };

  if (isLoadingEvent || isResuming) {
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
        {step === 'info' && (
          <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] p-4">
            <div className="flex flex-col gap-1">
              <span className="text-small text-[var(--text-secondary)]">Você está comprando</span>
              <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">{event?.title}</h2>
              <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                <span className="text-small text-[var(--text-secondary)]">{qty}x {batch?.name}</span>
                <span className="font-bold text-[var(--text-primary)]">R$ {((batch?.price || 0) * qty).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {step === 'info' && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-heading-3 font-semibold text-[var(--text-primary)]">Dados do comprador</h3>
              <div className="space-y-4">
                <SmartField label="Nome completo" icon={User} value={form.watch('buyerName')} onChange={(v) => form.setValue('buyerName', formatName(v), { shouldValidate: true })} isValid={isFullName(form.watch('buyerName'))} placeholder="Seu nome" error={form.formState.errors.buyerName?.message as string} />
                <SmartField label="WhatsApp" icon={Phone} value={form.watch('buyerWhatsApp')} onChange={(v) => form.setValue('buyerWhatsApp', maskWhatsApp(v), { shouldValidate: true })} isValid={onlyDigits(form.watch('buyerWhatsApp')).length === 11} placeholder="(00) 00000-0000" inputMode="tel" error={form.formState.errors.buyerWhatsApp?.message as string} />
                <SmartField label="E-mail" icon={Mail} value={form.watch('buyerEmail')} onChange={(v) => form.setValue('buyerEmail', v, { shouldValidate: true })} isValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.watch('buyerEmail'))} placeholder="seuemail@exemplo.com" inputMode="email" error={form.formState.errors.buyerEmail?.message as string} forceLowercase />
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
                  <div key={field.id} className="space-y-2 rounded-[var(--radius-md)] p-3">
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

            <p className="text-center text-xs leading-5 text-[var(--text-secondary)]">
              Ao continuar, você concorda com nossos{" "}
              <Link to="/termos" className="font-medium text-[var(--accent-text)] underline underline-offset-4">
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link to="/privacidade" className="font-medium text-[var(--accent-text)] underline underline-offset-4">
                Política de Privacidade
              </Link>.
            </p>

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
          <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-center gap-2 text-center">
              <Clock className="h-4 w-4 text-[var(--accent)]" />
              <p className="text-small text-[var(--text-secondary)]">Aguardando Pagamento — expira em <span className="font-mono font-bold text-[var(--accent-text)]">{formatTime(countdown)}</span></p>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border-2 border-[var(--accent)] bg-[var(--bg-secondary)] p-6">
              <div className="bg-white p-3 rounded-xl shadow-sm min-h-[190px] min-w-[190px] flex items-center justify-center">
                {pixData ? (
                  <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="h-[164px] w-[164px]" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
                )}
              </div>
              <div className="flex w-full flex-col gap-3">
                <Button
                  type="button"
                  disabled={countdown === 0 || !pixData}
                  className="h-12 w-full bg-[var(--accent)] text-[#111111] font-bold hover:bg-[var(--accent-hover)]"
                  onClick={copyPix}
                >
                  {pixCopied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  {pixCopied ? "Código Pix copiado" : "COPIAR CÓDIGO PIX"}
                </Button>
                <p className="text-center text-xs leading-5 text-[var(--text-secondary)]">
                  Copie o código e pague pelo aplicativo do seu banco. Depois do pagamento, aguarde a confirmação nesta tela.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!pixData || isCheckingPayment}
                  className="h-11 w-full border-[var(--border-default)]"
                  onClick={async () => {
                    const result = await refetchSaleStatus();
                    if (result.data === 'pago') {
                      toast.success("Pagamento confirmado! Abrindo seus ingressos...");
                    } else {
                      toast.info("Pagamento ainda não confirmado. Se você acabou de pagar, aguarde alguns segundos e tente novamente.");
                    }
                  }}
                >
                  {isCheckingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isCheckingPayment ? "Verificando pagamento..." : "Já paguei — verificar pagamento"}
                </Button>
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] p-4">
              <div className="flex flex-col gap-1">
                <span className="text-small text-[var(--text-secondary)]">Você está comprando</span>
                <h2 className="text-heading-3 font-bold text-[var(--text-primary)]">{event?.title}</h2>
                <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                  <span className="text-small text-[var(--text-secondary)]">{qty}x {batch?.name}</span>
                  <span className="font-bold text-[var(--text-primary)]">R$ {((batch?.price || 0) * qty).toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </MobileLayout>
  );
}
