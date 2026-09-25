# Histórico de Eventos

**Status:** 🟢 Implementação concluída — encerramento + snapshot histórico, 100% em dados reais (mock removido em 22/09/2026). Migration aplicada ao Supabase de produção. Ainda falta encerrar um evento real de ponta a ponta para validar o fluxo completo (ver seção 14).

---

## 1. Objetivo

Ferramenta para consultar os resultados e indicadores de eventos já encerrados: público, ingressos, receita, custos, bar e resultado financeiro consolidado.

Fica dentro de **Admin → Ferramentas**.

Princípio da ferramenta:

> O TicketFlow registra automaticamente o que aconteceu dentro do sistema; no encerramento, o produtor informa o que aconteceu fora dele; o sistema consolida tudo em um resultado histórico congelado.

---

## 2. Onde fica

```
ADMIN
 └── FERRAMENTAS
       └── Histórico de Eventos   → /admin/ferramentas/historico-eventos
             └── Detalhe do evento → /admin/ferramentas/historico-eventos/:id
```

Nenhum item novo foi adicionado ao menu lateral.

---

## 3. Encerramento do evento

O encerramento é iniciado em **Admin → Eventos**, pelo botão de arquivamento/encerramento do evento.

O botão abre um painel/modal grande, com 4 etapas:

1. **Público e bilheteria**
2. **Bar**
3. **Custos**
4. **Revisão**

### 3.1 Dados automáticos do TicketFlow

São carregados automaticamente e não podem ser editados:

- ingressos pagos antecipadamente pelo TicketFlow;
- receita dos ingressos pagos pelo TicketFlow;
- vendas antecipadas agrupadas por lote;
- check-ins de ingressos;
- check-ins de cortesias, usados apenas como referência.

### 3.2 Dados informados manualmente

O produtor informa:

**Público e bilheteria**
- ingressos vendidos na bilheteria;
- receita da bilheteria;
- cortesias presentes;
- público presente.

**Bar**
- venda total do bar;
- custo dos produtos do bar.

**Custos**
- custo total do evento, sem incluir o custo dos produtos do bar.

**Revisão**
- observações do produtor.

O campo de custo do bar existe somente na etapa **Bar**. Não há duplicação na etapa de custos.

---

## 4. Definição de público

Os números são tratados separadamente:

- **Ingressos antecipados:** ingressos pagos pelo TicketFlow.
- **Ingressos bilheteria:** ingressos pagos vendidos fora do TicketFlow, informados manualmente.
- **Cortesias presentes:** cortesias que efetivamente compareceram.
- **Público presente:** total real de pessoas que compareceram ao evento, informado manualmente.

Público presente não é calculado como ingressos + cortesias, porque pode haver no-show e também pessoas presentes que não se enquadram nesses dois grupos.

Os check-ins do TicketFlow aparecem somente como referência para ajudar o produtor a informar o número final.

---

## 5. Vendas antecipadas × bilheteria

O percentual de venda antecipada considera somente ingressos pagos:

```
Venda antecipada =
  ingressos antecipados /
  (ingressos antecipados + ingressos bilheteria)
```

Cortesias nunca entram nesse denominador.

A bilheteria não é tratada como lote do TicketFlow.

---

## 6. Financeiro

### Receitas

```
Receita de ingressos =
  receita TicketFlow + receita bilheteria

Receita do bar =
  venda total informada no encerramento

Receita total =
  receita de ingressos + receita do bar
```

### Custos

```
Custo do evento =
  valor único informado manualmente

Custo do bar =
  custo real dos produtos informado manualmente

Custos totais =
  custo do evento + custo do bar
```

### Resultado

```
Resultado líquido =
  receita total - custos totais

Margem =
  resultado líquido / receita total × 100
```

Se a receita total for zero, a margem é 0%.

O custo do bar nunca é assumido como 50% ou qualquer outro percentual fixo.

---

## 7. Bar

Indicadores:

- Venda total;
- Custo dos produtos;
- Resultado bruto;
- Custo sobre venda;
- Público presente;
- Consumo médio.

Fórmulas:

```
Resultado bruto =
  venda do bar - custo dos produtos

Custo sobre venda =
  custo dos produtos / venda do bar × 100

Consumo médio =
  venda do bar / público presente
```

Divisão por zero retorna 0.

---

## 8. Indicadores

O detalhe histórico apresenta:

- Ticket médio = receita de ingressos / ingressos pagos;
- Receita por pessoa = receita total / público presente;
- Consumo médio = receita do bar / público presente;
- Venda antecipada = ingressos antecipados / ingressos pagos;
- Cortesias = cortesias presentes / público presente;
- Custo do bar = custo dos produtos / receita do bar.

Divisões por zero retornam 0.

---

## 9. Snapshot histórico

Ao finalizar o encerramento, o banco executa uma única operação transacional:

1. valida que o usuário é administrador;
2. bloqueia o evento para evitar fechamento concorrente;
3. consolida as vendas pagas existentes;
4. consolida os lotes vendidos;
5. combina os dados automáticos com os dados manuais;
6. calcula os totais;
7. grava um snapshot JSON completo em `event_closures.snapshot`;
8. grava os campos manuais;
9. marca `events.is_closed = true`;
10. grava `events.closed_at`.

A tela do Histórico lê o **snapshot**, não recalcula o passado a partir da configuração atual do evento.

Isso é importante: alterar lotes, preços ou outros dados do evento depois do encerramento não modifica o histórico já fechado.

O registro de encerramento é único por evento.

---

## 10. Banco de dados

Migration:

`supabase/migrations/20260922230000_create_event_closures.sql`

Tabela:

`public.event_closures`

Campos principais:

- `organization_id`
- `event_id`
- `closed_by`
- `closed_at`
- `box_office_quantity`
- `box_office_revenue`
- `courtesies_present`
- `attendance_present`
- `bar_revenue`
- `bar_product_cost`
- `event_cost`
- `notes`
- `snapshot`

RPC:

`public.close_event(...)`

A RPC é `SECURITY DEFINER`, restringida a administradores, com `search_path = ''` e objetos explicitamente qualificados.

A tabela possui RLS e leitura somente para administradores da organização.

---

## 11. Código

Consultas e mutações:

`src/lib/event-history-queries.ts`

Formulário de encerramento:

`src/components/admin/EventClosurePanel.tsx`

Lista real:

`src/pages/admin/EventHistoryListPage.tsx`

Detalhe real:

`src/pages/admin/EventHistoryDetailPage.tsx`

Entrada do encerramento:

`src/pages/admin/EventsListPage.tsx`

Tipos Supabase:

`src/integrations/supabase/types.ts`

---

## 12. MOCK

O arquivo `historico-eventos.mock.ts` foi removido do repositório (22/09/2026) — a ferramenta usa exclusivamente dados reais (`event_closures` via `event-history-queries.ts`). Não há mais nenhum dado fictício na lista nem no detalhe.

---

## 13. Segurança e permissões

- Apenas administradores podem finalizar eventos.
- Colaboradores continuam sem acesso à ferramenta de Histórico, conforme as rotas existentes.
- A escrita do encerramento ocorre pela RPC.
- A tabela histórica não aceita INSERT/UPDATE/DELETE direto pelo cliente autenticado.
- O snapshot fica vinculado à organização e ao evento.
- Um evento não pode receber dois encerramentos.

---

## 14. Próximas validações

Antes de considerar a entrega concluída:

1. ~~aplicar a migration no Supabase de produção~~ — **feito em 22/09/2026** (tabela `event_closures` e RPC `close_event` confirmadas no projeto `ywcdopjqfhisopipqxgq`);
2. validar build/CI;
3. abrir **Eventos → Encerrar evento**;
4. conferir dados automáticos de um evento real;
5. preencher bilheteria, cortesias presentes, público presente, bar e custos;
6. revisar o resumo;
7. finalizar;
8. confirmar que o evento aparece em **Ferramentas → Histórico de Eventos**;
9. abrir o detalhe e conferir os cálculos;
10. confirmar que alterações posteriores na configuração do evento não alteram o snapshot.

**Importante:** a migration já foi aplicada ao Supabase de produção. Os itens 2 a 10 (validação funcional ponta a ponta com um evento real) ainda não foram confirmados.


---

## 15. Ajuste visual dos resultados

Na tela de detalhe do Histórico de Eventos:

- o KPI **Resultado** utiliza explicitamente o mesmo tamanho de valor `text-heading-1` dos demais KPIs do topo;
- o **Resultado líquido**, na seção Financeiro, utiliza o mesmo nível de destaque tipográfico do resultado principal, mantendo a cor semântica de positivo/negativo;
- nenhuma regra de cálculo ou dado foi alterada.
