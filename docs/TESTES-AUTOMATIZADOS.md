# TicketFlow — Testes automatizados

**Atualizado:** 08/09/2026 BRT  
**Agente:** ChatGPT  
**Branch:** `main`

## Objetivo

Este documento registra a estratégia e o estado real dos testes automatizados do TicketFlow. Ele complementa `docs/AUDITORIA-QUALIDADE.md`, especialmente o item `QUA-008`.

## Estado atual

Antes desta implementação, o repositório não possuía arquivos `.test.`/`.spec.` nem um runner de testes.

Foi criada a primeira camada de testes usando o **Bun Test Runner**, evitando adicionar uma nova dependência de produção ou um novo framework ao projeto.

### Implementado nesta etapa

- Primeiro conjunto de testes em `tests/checkout-prefill.test.ts`.
- Regra isolada em `src/lib/checkout-prefill.ts` para permitir teste unitário sem renderizar a aplicação.
- Pipeline GitHub Actions em `.github/workflows/quality.yml` para executar os testes e o build de produção a cada push na `main` e pull request para `main`.
- O pipeline executa `bun test tests/checkout-prefill.test.ts` diretamente.
- O `package.json` não recebeu script `test`; portanto, `bun test` é executado diretamente pelo CI.
- Nenhuma dependência de produção foi adicionada para criar esta camada.

## Regra testada

A função `buildCheckoutPrefill()` representa a regra definida para o produto:

- visitante/guest continua podendo comprar sem conta;
- cliente autenticado pode reutilizar nome, WhatsApp e e-mail já cadastrados;
- e-mail do cadastro de autenticação serve como fallback quando o registro `customers` não possui e-mail;
- campos ausentes não são inventados.

**Importante:** esta etapa criou e testou a regra isolada. A integração visual dessa regra dentro do checkout será feita em uma etapa própria, porque o arquivo atual concentra formulário, criação da venda, Pix e retomada de compra e deve ser alterado sem risco de regressão no fluxo já validado.

## Validação executada

O ambiente de execução desta sessão não possui Bun instalado, portanto os testes unitários não foram executados localmente. O pipeline do GitHub Actions foi criado para fazer essa validação em ambiente limpo.

O build de produção também é executado pelo pipeline. A versão de produção foi previamente validada no Vercel após a correção da versão inválida de `@radix-ui/react-menubar`.

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

Testes não substituem validação manual de Mercado Pago, navegador móvel ou operação de check-in. Eles devem complementar esses testes reais.

## Próxima etapa

A próxima implementação deve ser a integração do prefill no checkout e, em paralelo, a primeira suíte de integração das RPCs críticas em ambiente isolado. Depois disso, implementar a recuperação segura de compra guest (`AUD-008`) com os testes de segurança correspondentes.
