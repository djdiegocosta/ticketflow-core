# TicketFlow — Testes automatizados

**Atualizado:** 08/09/2026 BRT
**Agente:** ChatGPT
**Branch:** `main`

## Objetivo

Este documento registra a estratégia e o estado real dos testes automatizados do TicketFlow. Ele complementa `docs/AUDITORIA-QUALIDADE.md`, especialmente o item `QUA-008`.

## Estado atual

Antes desta implementação, o repositório não possuía arquivos `.test.`/`.spec.` nem um runner de testes.

Foi criada a primeira camada de testes com **Vitest**, escolhido por ser integrado ao Vite e oferecer suporte nativo a TypeScript. A documentação oficial confirma que Vitest reutiliza a configuração do Vite e executa arquivos `.test.ts` sem uma etapa separada de compilação. citeturn0search1turn0search2

### Implementado nesta etapa

- `vitest` adicionado como dependência de desenvolvimento.
- `npm test` equivalente do projeto: `bun run test` → `vitest run`.
- `bun run test:watch` → execução em modo de observação.
- `vitest.config.ts` criado.
- Primeiro conjunto de testes criado em `tests/checkout-prefill.test.ts`.
- Pipeline GitHub Actions criado em `.github/workflows/quality.yml` para executar testes e build de produção a cada push na `main` e pull request para `main`.
- Criado `src/lib/checkout-prefill.ts` para centralizar uma regra pura e testável do checkout.

## Regra testada

A função `buildCheckoutPrefill()` representa a regra definida para o produto:

- visitante/guest continua podendo comprar sem conta;
- cliente autenticado pode reutilizar nome, WhatsApp e e-mail já cadastrados;
- e-mail do cadastro de autenticação serve como fallback quando o registro `customers` não possui e-mail;
- campos ausentes não são inventados.

**Importante:** esta etapa criou e testou a regra isolada. A integração visual dessa regra dentro de `CheckoutPage.tsx` será feita em uma etapa própria, porque o arquivo atual concentra o formulário, criação da venda, Pix e retomada de compra e deve ser alterado sem risco de regressão no fluxo já validado.

## O que ainda NÃO está coberto

Os testes unitários acima não comprovam o comportamento real do banco. Para isso serão necessários testes de integração em ambiente isolado, principalmente para:

1. `create_pending_sale` e reserva concorrente de estoque.
2. Expiração de venda e liberação do estoque.
3. `confirm_sale_paid` idempotente.
4. `create_locked_tickets` sem duplicação.
5. webhook Mercado Pago com assinatura e repetição da notificação.
6. RLS e isolamento entre organizações/usuários.
7. check-in válido, duplicado e sincronização offline.
8. recuperação de compra guest.
9. associação posterior de uma compra guest a uma conta.

Não usar Mercado Pago real nesses testes. O pagamento externo deve ser simulado/mocado; o teste manual real do Mercado Pago continua sendo a validação operacional externa.

## Estratégia por camadas

### Camada 1 — Unitária

Regras puras, transformações, validações e decisões de interface. Devem rodar rapidamente em todo push.

### Camada 2 — Integração de banco

RPCs, RLS, estoque, expiração, idempotência e criação de ingressos. Deve usar banco de teste isolado, nunca dados reais de produção.

### Camada 3 — E2E

Fluxos críticos no navegador: evento → checkout → venda pendente → Pix simulado → confirmação → ingresso; além de recuperação guest e check-in.

## Regra para agentes futuros

Antes de alterar uma regra crítica, primeiro procure o teste correspondente. Se a regra ainda não tiver teste, o agente deve adicionar o teste na mesma alteração sempre que possível.

Testes não substituem validação manual de Mercado Pago, navegador móvel ou operação de check-in. Eles reduzem regressões e devem complementar esses testes reais.

## Próxima etapa

A próxima implementação deve ser a integração do prefill no checkout e, em paralelo, a primeira suíte de integração das RPCs críticas em ambiente isolado. Depois disso, implementar a recuperação segura de compra guest (`AUD-008`) com os testes de segurança correspondentes.
