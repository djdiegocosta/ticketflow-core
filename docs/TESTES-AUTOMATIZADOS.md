# TicketFlow — Testes automatizados

**Atualizado:** 08/09/2026 BRT  
**Agente:** ChatGPT  
**Branch:** `main`

## Objetivo

Este documento registra a estratégia e o estado real dos testes automatizados do TicketFlow. Ele complementa `docs/AUDITORIA-QUALIDADE.md`, especialmente o item `QUA-008`.

## Estado atual

O projeto possui uma primeira camada unitária usando o **Bun Test Runner**, sem adicionar um framework de testes à aplicação.

### Camada 1 — implementada

- `tests/checkout-prefill.test.ts` cobre a regra de preenchimento do checkout.
- `src/lib/checkout-prefill.ts` centraliza essa regra em uma função pura.
- `src/pages/CheckoutPage.tsx` usa os dados do cliente autenticado para preencher automaticamente nome, WhatsApp e e-mail.
- O cadastro é procurado pela organização do evento.
- O e-mail autenticado é usado como fallback quando o cadastro do cliente não possui e-mail.
- O usuário continua podendo editar os campos.
- Checkout guest continua sem exigir autenticação.
- `.github/workflows/quality.yml` executa testes e build a cada push na `main` e pull request para `main`.
- O pipeline executa `bun test tests/checkout-prefill.test.ts` diretamente.
- O `package.json` não recebeu script `test` nem nova dependência de testes.

### Camada 2 — smoke de integração do banco executado

Em 08/09/2026 foi executada uma bateria controlada diretamente no projeto Supabase conectado ao TicketFlow, usando o evento real de teste operacional e removendo os dados criados ao final.

Foram verificados:

1. `create_pending_sale` cria venda pendente com os participantes corretos.
2. Reserva de estoque reduz a quantidade do lote exatamente pela quantidade vendida.
3. Validação rejeita quantidade de participantes diferente da quantidade de ingressos.
4. `confirm_sale_paid` confirma uma venda pendente.
5. Segunda chamada de `confirm_sale_paid` não confirma novamente a mesma venda.
6. `create_locked_tickets` cria exatamente um ingresso por participante.
7. Segunda chamada de `create_locked_tickets` não duplica ingressos.
8. Venda expirada não pode ser confirmada como paga.
9. `expire_pending_sales` altera a venda para `expirado`.
10. `expire_pending_sales` devolve ao lote o estoque reservado pela venda expirada.
11. Após os testes, vendas e ingressos temporários foram removidos e o estoque do lote foi restaurado ao valor anterior.
12. Não ficaram registros de teste com o identificador `QA2` no banco.

Resultado: **PASS** para os cenários executados.

Também foi verificado estruturalmente que `sales`, `tickets`, `customers`, `ticket_batches` e `events` estão com RLS habilitado. A validação completa de isolamento entre dois usuários/organizações ainda requer uma suíte executada com sessões autenticadas distintas.

### Limitação importante

Este smoke test foi executado no projeto Supabase operacional porque a sessão atual não dispõe de um banco Supabase local/isolado com a mesma estrutura para rodar a suíte. Portanto, ele **não substitui** a futura suíte automatizada de integração em banco isolado.

Nenhum teste utilizou Mercado Pago real. A confirmação foi simulada pela RPC de banco.

## Validação CI

O GitHub Actions executou com sucesso o run `34273320014`: instalação de dependências, testes automatizados e build de produção concluíram sem erro.

O Vercel também concluiu com estado `READY` a implantação correspondente à integração do prefill do checkout.

O ambiente local desta sessão não possui Bun, portanto os testes unitários são validados pelo CI.

## O que ainda NÃO está coberto

1. Teste automatizado concorrente de duas compras disputando o último estoque.
2. RLS com dois usuários autenticados de organizações diferentes.
3. Check-in autenticado, duplicado e sincronização offline.
4. Webhook Mercado Pago com assinatura e repetição da notificação.
5. Recuperação de compra guest.
6. Associação posterior de compra guest a uma conta.
7. E2E completo no navegador.

## Estratégia por camadas

### Camada 1 — Unitária

Regras puras, transformações, validações e decisões de interface. Devem rodar rapidamente em todo push.

### Camada 2 — Integração de banco

RPCs, RLS, estoque, expiração, idempotência e criação de ingressos. O smoke controlado já foi executado. A automação definitiva deve usar banco de teste isolado e nunca dados reais de produção.

### Camada 3 — E2E

Fluxos críticos no navegador: evento → checkout → venda pendente → Pix simulado → confirmação → ingresso; além de recuperação guest e check-in.

## Regra para agentes futuros

Antes de alterar uma regra crítica, primeiro procure o teste correspondente. Se a regra ainda não tiver teste, o agente deve adicionar o teste na mesma alteração sempre que possível.

Testes não substituem validação manual de Mercado Pago, navegador móvel ou operação de check-in. Eles devem complementar esses testes reais.

## Próxima etapa

Criar a suíte automatizada de integração em banco isolado, incluindo concorrência e RLS com sessões distintas. Em seguida, implementar a recuperação segura de compra guest (`AUD-008`) com testes de segurança correspondentes.
