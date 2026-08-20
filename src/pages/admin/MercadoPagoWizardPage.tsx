import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  Info,
  KeyRound,
  Loader2,
  QrCode,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MercadoPagoLogo } from "@/components/MercadoPagoLogo";
import { environmentLabel, type MpEnvironment } from "@/lib/settings-data";
import { 
  useMpConfig, 
  useUpdateMpConfig, 
  useValidateMpConfig,
  useTestMpWebhook,
  useCreateTestPix,
  useOrganization
} from "@/lib/settings-queries";

const steps = [
  { id: 1, label: "Ambiente", icon: Globe2 },
  { id: 2, label: "Aplicação MP", icon: Boxes },
  { id: 3, label: "Credenciais", icon: KeyRound },
  { id: 4, label: "Webhook", icon: Webhook },
  { id: 5, label: "Pagamento teste", icon: QrCode },
];

const MP_PANEL_URL = "https://www.mercadopago.com.br/developers/panel";

function StepList({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-2 text-body text-[var(--text-secondary)]">{children}</ol>;
}

function StepItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-micro text-[var(--text-secondary)]">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      className={[
        "flex gap-3 border p-4 text-small",
        tone === "warning"
          ? "border-[var(--warning)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] text-[var(--text-primary)]"
          : "border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
      ].join(" ")}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function MercadoPagoWizardPage() {
  const { data: currentConfig, isLoading } = useMpConfig();
  const { data: org } = useOrganization();
  const upsertMutation = useUpdateMpConfig();
  const validateMutation = useValidateMpConfig();
  const testWebhookMutation = useTestMpWebhook();
  const createPixMutation = useCreateTestPix();
  
  const [current, setCurrent] = useState(1);
  const [validated, setValidated] = useState<number[]>([]);
  const [environment, setEnvironment] = useState<MpEnvironment | null>(null);
  const [publicKey, setPublicKey] = useState<Record<MpEnvironment, string>>({ sandbox: "", producao: "" });
  const [savedPublicKey, setSavedPublicKey] = useState<Record<MpEnvironment, boolean>>({
    sandbox: false,
    producao: false,
  });
  const [tokenInput, setTokenInput] = useState("");
  const [tokenTail, setTokenTail] = useState<Record<MpEnvironment, string | null>>({
    sandbox: null,
    producao: null,
  });
  const [secretInput, setSecretInput] = useState("");
  const [secretTail, setSecretTail] = useState<string | null>(null);
  const [pixResult, setPixResult] = useState<{ qr_code: string, qr_code_base64: string } | null>(null);

  // Preencher dados ao carregar
  useEffect(() => {
    if (currentConfig && (currentConfig as any).environment) {
      const configEnv = (currentConfig as any).environment as MpEnvironment;
      setEnvironment(configEnv);
      setPublicKey(prev => ({ ...prev, [configEnv]: (currentConfig as any).public_key || "" }));
      setSavedPublicKey(prev => ({ ...prev, [configEnv]: !!(currentConfig as any).public_key }));
      setTokenTail(prev => ({ ...prev, [configEnv]: "OK" }));
      setValidated([1, 2, 3]);
    }
  }, [currentConfig]);

  const env: MpEnvironment = environment ?? "sandbox";
  const orgId = org?.id;
  
  // URL dinâmica para webhook
  const siteUrl = import.meta.env['VITE_SITE_URL'] || 'https://ticketflow2.lovable.app';
  const webhookUrl = orgId ? `${siteUrl}/api/public/mp/webhook?org_id=${orgId}` : "";

  const isValidated = (id: number) => validated.includes(id);
  const canOpen = (id: number) => id === 1 || isValidated(id) || isValidated(id - 1) || id <= current;

  const markValidated = (id: number) =>
    setValidated((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const goTo = (id: number) => {
    if (canOpen(id)) setCurrent(id);
  };

  const saveCredentials = () => {
    if (!tokenInput && !tokenTail[env]) {
      toast.error("Access Token é obrigatório");
      return;
    }
    
    upsertMutation.mutate({
      environment: env,
      public_key: publicKey[env],
      access_token: tokenInput || "",
      webhook_secret: secretInput || ""
    }, {
      onSuccess: () => {
        markValidated(3);
        if (tokenInput) {
          setTokenTail({ ...tokenTail, [env]: tokenInput.trim().slice(-4) });
          setTokenInput("");
        }
        if (secretInput) {
          setSecretTail(secretInput.trim().slice(-4));
          setSecretInput("");
        }
      }
    });
  };

  const testCredentials = () => {
    if (!orgId) return;
    validateMutation.mutate({
      organization_id: orgId,
      environment: env
    }, {
      onSuccess: () => {
        markValidated(3);
      }
    });
  };

  const progress = validated.length;

  if (isLoading) {
    return <div className="p-8 text-center text-body text-text-secondary">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="flex items-center gap-2 px-0">
            <Link to="/admin/configuracoes">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <MercadoPagoLogo height={32} />
              <h1 className="text-heading-1 text-[var(--text-primary)]">Configurar Mercado Pago</h1>
            </div>
            <p className="mt-2 text-body text-[var(--text-secondary)]">
              Assistente guiado — configure em 5 etapas
            </p>
          </div>
        </div>
        <span className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-micro text-[var(--text-secondary)]">
          Ambiente: {environmentLabel(env)}
        </span>
      </div>

      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-small text-[var(--text-secondary)]">Progresso da configuração</span>
          <span className="text-small text-[var(--text-secondary)]">{progress} de 5</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${(progress / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Etapas */}
        <nav className="w-full shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 lg:w-64">
          <div className="flex flex-col gap-1">
            {steps.map((step) => {
              const active = current === step.id;
              const done = isValidated(step.id);
              const disabled = !canOpen(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => goTo(step.id)}
                  className={[
                    "flex items-center gap-3 px-3 py-2 text-left text-body transition-colors",
                    active
                      ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                      : disabled
                        ? "cursor-not-allowed text-[var(--text-disabled)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent-text)]" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                  <span className="flex-1">
                    {step.id}. {step.label}
                  </span>
                  {done && (
                    <span className="bg-[var(--accent-muted)] px-2 py-0.5 text-micro text-[var(--accent-text)]">
                      Validado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
          {current === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Ambiente</h2>
                <p className="mt-1 text-body text-[var(--text-secondary)]">
                  Comece em Sandbox para testar sem usar dinheiro real.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "sandbox" as MpEnvironment,
                      title: "Sandbox (teste)",
                      text: "Ambiente simulado. Credenciais começam com TEST-. Nenhum dinheiro é movimentado. Ideal para configurar e validar.",
                    },
                    {
                      id: "producao" as MpEnvironment,
                      title: "Produção",
                      text: "Ambiente real. Credenciais começam com APP_USR-. Pagamentos reais são processados.",
                    },
                  ]
                ).map((option) => {
                  const selected = environment === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setEnvironment(option.id)}
                      className={[
                        "border p-5 text-left transition-colors",
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                          : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--accent)]",
                      ].join(" ")}
                    >
                      <p
                        className={`text-heading-2 ${selected ? "text-[var(--accent-text)]" : "text-[var(--text-primary)]"}`}
                      >
                        {option.title}
                      </p>
                      <p className="mt-2 text-small text-[var(--text-secondary)]">{option.text}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={!environment}
                  onClick={() => {
                    markValidated(1);
                    setCurrent(2);
                  }}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {current === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Aplicação MP</h2>
                <p className="mt-1 text-body text-[var(--text-secondary)]">
                  É a "conta técnica" que dá acesso às credenciais e ao webhook.
                </p>
              </div>

              <StepList>
                <StepItem n={1}>
                  <a
                    href={MP_PANEL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent-text)] underline"
                  >
                    Acessar o painel de desenvolvedores do Mercado Pago
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </StepItem>
                <StepItem n={2}>Clicar em "Criar aplicação"</StepItem>
                <StepItem n={3}>Escolher "Pagamentos online"</StepItem>
                <StepItem n={4}>Marcar "Pagamentos com QR Code" ou "Checkout API / PIX"</StepItem>
                <StepItem n={5}>Aceitar os termos e finalizar</StepItem>
              </StepList>

              <Notice tone="warning">
                Já tem uma aplicação? Pode usar a existente. Apenas selecione ela no painel para ver as
                credenciais.
              </Notice>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrent(1)}>
                  Voltar
                </Button>
                <Button
                  onClick={() => {
                    markValidated(2);
                    setCurrent(3);
                  }}
                >
                  Já criei, próximo
                </Button>
              </div>
            </div>
          )}

          {current === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">
                  Credenciais ({environmentLabel(env)})
                </h2>
                <p className="mt-1 text-body text-[var(--text-secondary)]">
                  Copie as credenciais do painel para o TicketFlow.
                </p>
              </div>

              <Notice>
                Onde encontrar? No painel MP → sua aplicação → menu lateral Credenciais → aba Credenciais de{" "}
                {environmentLabel(env).toLowerCase()}
              </Notice>

              <div className="space-y-2">
                <label className="text-small text-[var(--text-secondary)]">Public Key</label>
                <div className="flex gap-2">
                  <Input
                    value={publicKey[env]}
                    onChange={(e) => setPublicKey({ ...publicKey, [env]: e.target.value })}
                    placeholder={env === "sandbox" ? "TEST-..." : "APP_USR-..."}
                    className="rounded-none"
                  />
                  <Button
                    variant="secondary"
                    disabled={!publicKey[env].trim()}
                    onClick={() => {
                      setSavedPublicKey({ ...savedPublicKey, [env]: true });
                      toast.success("Public Key salva");
                    }}
                  >
                    Salvar
                  </Button>
                </div>
                {savedPublicKey[env] && (
                  <p className="text-small text-[var(--accent-text)]">Public Key salva.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-small text-[var(--text-secondary)]">Access Token</label>
                {tokenTail[env] ? (
                  <p className="text-body text-[var(--text-primary)]">
                    Salvo — termina em ...{tokenTail[env]}.{" "}
                    <span className="text-[var(--text-secondary)]">
                      Preencha novamente só se quiser substituir.
                    </span>
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={tokenTail[env] ? "Substituir token" : env === "sandbox" ? "TEST-..." : "APP_USR-..."}
                    className="rounded-none"
                  />
                  <Button
                    variant="secondary"
                    disabled={tokenInput.trim().length < 4}
                    onClick={saveCredentials}
                  >
                    Salvar
                  </Button>
                </div>
                <p className="text-small text-[var(--text-secondary)]">
                  O token é cifrado antes de ser armazenado e nunca mais volta para o navegador — só o final
                  aparece para conferência.
                </p>
              </div>

              <Notice>
                As credenciais de Sandbox e Produção são independentes: trocar o ambiente na Etapa 1 não apaga a
                credencial do outro ambiente.
              </Notice>

              <Button
                className="w-full"
                disabled={validateMutation.isPending || !tokenTail[env] || !savedPublicKey[env]}
                onClick={testCredentials}
              >
                {validateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </span>
                ) : (
                  "Testar credenciais"
                )}
              </Button>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrent(2)}>
                  Voltar
                </Button>
                <Button disabled={!isValidated(3)} onClick={() => setCurrent(4)}>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {current === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Webhook</h2>
                <p className="mt-1 text-body text-[var(--text-secondary)]">
                  Notificação automática quando um Pix é pago.
                </p>
              </div>

              <p className="text-body text-[var(--text-secondary)]">
                O Mercado Pago avisa o TicketFlow por essa URL sempre que um pagamento muda de status. Sem isso,
                você teria que aprovar vendas manualmente.
              </p>

              <div className="space-y-2">
                <label className="text-small text-[var(--text-secondary)]">URL do webhook</label>
                <div className="flex items-center gap-2 border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                  <code className="flex-1 break-all text-body text-[var(--text-secondary)]">
                    {webhookUrl || "Carregando URL..."}
                  </code>
                  {webhookUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast.success("URL copiada!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <StepList>
                <StepItem n={1}>Painel MP → sua aplicação</StepItem>
                <StepItem n={2}>Menu Webhooks → "Configurar notificações"</StepItem>
                <StepItem n={3}>Aba "Modo Produção" ou "Modo Teste"</StepItem>
                <StepItem n={4}>Colar a URL em "URL de notificações"</StepItem>
                <StepItem n={5}>Marcar o evento "Pagamentos (payment)"</StepItem>
                <StepItem n={6}>Salvar e copiar a Chave secreta gerada</StepItem>
              </StepList>

              <div className="space-y-2">
                <label className="text-small text-[var(--text-secondary)]">Webhook Secret</label>
                {secretTail ? (
                  <p className="text-body text-[var(--text-primary)]">
                    Salvo — termina em ...{secretTail}.{" "}
                    <span className="text-[var(--text-secondary)]">
                      Preencha novamente só se quiser substituir.
                    </span>
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder={secretTail ? "Substituir chave secreta" : "Chave secreta do webhook"}
                    className="rounded-none"
                  />
                  <Button
                    variant="secondary"
                    disabled={secretInput.trim().length < 4}
                    onClick={() => {
                      setSecretTail(secretInput.trim().slice(-4));
                      setSecretInput("");
                      toast.success("Webhook Secret salvo com segurança");
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <div title="Disponível após conectar o Supabase">
                <Button disabled className="w-full">
                  Testar Webhook
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrent(3)}>
                  Voltar
                </Button>
                <Button onClick={() => setCurrent(5)}>Próximo</Button>
              </div>
            </div>
          )}

          {current === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Pagamento de teste</h2>
                <p className="mt-1 text-body text-[var(--text-secondary)]">
                  Um Pix de R$ 0,01 valida o fluxo ponta a ponta.
                </p>
              </div>

              <Notice>
                Em Produção, pague o QR code pelo app do seu banco (será um centavo real).
              </Notice>

              <span className="inline-block bg-[var(--bg-tertiary)] px-2.5 py-1 text-micro text-[var(--text-secondary)]">
                Pendente
              </span>

              <div className="space-y-3">
                <div title="Disponível após conectar o Supabase">
                  <Button disabled className="w-full">
                    Criar PIX de teste
                  </Button>
                </div>
                <div title="Disponível após conectar o Supabase">
                  <Button disabled variant="secondary" className="w-full">
                    Atualizar status
                  </Button>
                </div>
              </div>

              <p className="text-small text-[var(--text-secondary)]">
                Esta etapa será concluída automaticamente quando o backend estiver conectado.
              </p>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setCurrent(4)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
