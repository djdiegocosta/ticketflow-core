# TicketFlow — Testes automatizados

**Atualizado:** 08/09/2026 BRT  
**Agente:** ChatGPT  
**Branch:** `main`

## Objetivo

Este documento registra a estratégia e o estado real dos testes automatizados do TicketFlow. Ele complementa `docs/AUDITORIA-QUALIDADE.md`, especialmente o item `QUA-008`.

## Estado atual

O projeto agora possui uma primeira camada unitária usando o **Bun Test Runner**, sem adicionar um framework de testes à aplicação.

### Implementado

- `tests/checkout-prefill.test.ts` cobre a regra de preenchimento do checkout.
- `src/lib/checkout-prefill.ts` centraliza essa regra em uma função pura.
- `src/pages/CheckoutPage.tsx` agora usa os dados do cliente autenticado para preencher automaticamente nome, WhatsApp e e-mail.
- O cadastro é procurado pela organização do evento, evitando usar por engano um registro de outra organização.
- O e-mail autenticado é usado como fallback quando o cadastro do cliente não possui e-mail, inclusive quando o registro de cliente ainda não existe.
- O usuário continua podendo editar os campos. O prefill não sobrescreve um campo que já tenha sido alterado pelo usuário.
- Checkout guest continua sem exigir autenticação ou cadastro.
- `.github/workflows/quality.yml` executa testes e build a cada push na `main` e pull request para `main`.
- O pipeline executa `bun test tests/checkout-prefill.test.ts` diretamente.
- O `package.json` não recebeu script `test` nem nova dependência de testes.

## Validação executada

O GitHub Actions executou com sucesso o run `34273320014` após esta documentação: instalação de dependências, testes automatizados e build de produção concluíram sem erro.

O Vercel também concluiu com sucesso o build da versão anterior após a correção de `@radix-ui/react-menubar`. Uma nova implantação é disparada pelos commits desta etapa e deve ser considerada válida somente após estado `READY`.

O ambiente local desta sessão não possui Bun, portanto a suíte não foi executada localmente. A validação efetiva desta etapa foi feita pelo CI.

## Regra testada

A função `buildCheckoutPrefill()` representa a regra definida para o produto:

- visitante/guest continua podendo comprar sem conta;
- cliente autenticado pode reutilizar nome, WhatsApp e e-mail já cadastrados;
- e-mail do cadastro de autenticação serve como fallback quando o registro `customers` não possui e-mail;
- campos ausentes não são inventados.

A integração foi feita no checkout sem alterar a criação da venda, geração do Pix ou retomada de compra existente.

## O que ainda NÃO está coberto

Os testes atuais não comprovam o comportamento real do banco. Para isso serão necessários testes de integração em ambiente isolado, principalmente para:

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

Testes não substituem validação manual de Mercado Pago, navegador móvel ou operação de check-in. Eles devem complementar esses testes reais.

## Próxima etapa

A próxima implementação é a primeira suíte de integração das RPCs críticas em ambiente isolado. Depois disso, implementar a recuperação segura de compra guest (`AUD-008`) com testes de segurança correspondentes.
