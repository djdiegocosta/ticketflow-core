# TicketFlow — Vinculação de compra de visitante ao cadastro

**Data:** 08/09/2026
**Status:** IMPLEMENTADO
**Escopo:** organização única do TicketFlow

## Regra oficial

Uma compra realizada sem cadastro, quando aprovada, deve continuar recuperável pelo cliente depois que ele criar uma conta usando o mesmo e-mail informado na compra.

Quando o cadastro é criado com esse e-mail, as vendas anteriores que:

- foram feitas como visitante;
- estão com `customer_id` vazio;
- estão com status `pago`;
- possuem `buyer_email` igual ao e-mail da conta, ignorando maiúsculas/minúsculas e espaços;

são vinculadas ao registro `customers` do usuário.

A página de ingressos já consulta as vendas vinculadas ao cliente. Portanto, depois do vínculo, os ingressos das compras anteriores passam a aparecer junto aos demais ingressos da conta.

## O que foi corrigido

### 1. Cadastro novo

`signup_customer` agora vincula, dentro da própria transação do cadastro, as compras pagas anteriores feitas com o mesmo e-mail.

Isso cobre o cenário em que o cliente compra como visitante e imediatamente depois cria uma conta.

### 2. Contas que já existiam

Foi criada a função `link_guest_purchases_to_current_customer()` para permitir a reconciliação segura de compras pagas de visitante com a conta autenticada.

A migration também executou uma reconciliação única das contas existentes, para corrigir registros históricos que já estavam no banco antes desta regra.

### 3. Compras pendentes

Compras `pendente` não são vinculadas por esta regra. Isso evita transformar uma tentativa de compra não paga em ingresso válido.

### 4. Segurança

A associação usa o e-mail da conta autenticada e somente vendas ainda sem `customer_id` e já pagas. A função de reconciliação é `SECURITY DEFINER` e não fica disponível para usuários anônimos.

## E-mail da compra

No fluxo atual, depois que o Mercado Pago confirma o pagamento, o webhook confirma a venda, cria os ingressos e chama `sendPurchaseConfirmationEmail`. Portanto, a compra aprovada possui envio de confirmação por e-mail para o `buyer_email` registrado na venda.

O e-mail é uma camada de recuperação/confirmação. Ele não substitui a vinculação da compra à conta quando o cliente posteriormente se cadastra.

## Arquivos/migrations

- `supabase/migrations/20260908234234_link_guest_purchases_to_account_by_email.sql`
- `supabase/migrations/20260908234246_link_guest_purchases_after_customer_signup.sql`
- `src/lib/customer-queries.ts` já consulta as vendas por `customer_id`, portanto não foi necessário alterar a tela de ingressos.

## Validação

- Migrations aplicadas no Supabase operacional.
- Foi verificado após a reconciliação que não restam vendas `pago` sem `customer_id` quando existe uma conta cadastrada com o mesmo e-mail.
- Resultado da verificação: `0` vendas órfãs nessa condição.

## Regra de teste obrigatória

O fluxo deve ser considerado protegido quando os testes cobrirem:

1. visitante compra e paga;
2. ingresso é criado;
3. visitante cria conta com o mesmo e-mail;
4. compra anterior aparece em **Meus ingressos**;
5. nova compra pendente não aparece como ingresso válido;
6. e-mail diferente não recebe acesso à compra de outra pessoa;
7. uma compra já vinculada não é vinculada novamente.
