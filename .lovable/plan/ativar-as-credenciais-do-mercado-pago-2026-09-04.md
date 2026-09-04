# Ativar as credenciais do Mercado Pago

O sistema já tem tudo pronto para receber pagamentos por Pix: o assistente de configuração em 5 passos, a geração do Pix no checkout e o aviso automático do Mercado Pago quando o pagamento é aprovado. Falta apenas uma coisa técnica antes de você digitar suas credenciais — a chave que protege (criptografa) esses dados dentro do sistema. Sem ela, o salvamento das credenciais falha.

## O que será feito

1. Criar automaticamente a chave de proteção das credenciais (você não precisa digitar nada nesse passo).
2. Confirmar que o assistente do Mercado Pago abre em Configurações e que o endereço de aviso (webhook) exibido é o correto do seu site.
3. Abrir para você, dentro do próprio assistente, os campos para preencher:
   - Ambiente (teste ou produção)
   - Public Key
   - Access Token
   - Chave secreta do webhook (a que o Mercado Pago mostra ao cadastrar a notificação)
4. Validar as credenciais direto com o Mercado Pago (o assistente já faz essa verificação e mostra se estão válidas).
5. Você copia o endereço de webhook exibido no assistente e cola no painel do Mercado Pago, marcando o evento de pagamentos; depois testamos com um Pix real de valor baixo pelo próprio assistente.

Importante: as credenciais são preenchidas por você nas telas do sistema (ficam guardadas criptografadas e separadas por organização), não em um formulário de segredos. O único segredo de sistema criado é a chave de proteção.

## Detalhes técnicos

- Criar o segredo `APP_ENCRYPTION_KEY` (64 caracteres) via `generate_secret`. É lido em `src/lib/mp/utils.server.ts` para AES-256-GCM; hoje ele não existe, então `saveMpCredentials` falha.
- Nenhuma mudança de banco: a tabela `mp_config` já existe com `public_key`, `access_token_encrypted`, `webhook_secret_encrypted`, `environment`, `validated_at`.
- Nenhuma mudança nas server functions `saveMpCredentials` / `validateMpCredentials` / `testMpWebhook` / `createMpPix`, nem na rota `src/routes/api/public/mp/webhook.ts` (assinatura HMAC v1 já validada).
- Ajuste mínimo, se necessário: garantir que a URL de webhook use a URL publicada estável do projeto quando `VITE_SITE_URL` não estiver definida (hoje o fallback já é `https://ticketflow2.lovable.app`, então provavelmente nada muda).
- Verificação final: apenas o fluxo de Mercado Pago (assistente, validação e Pix de teste), sem mexer em outras telas.
