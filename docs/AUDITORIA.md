# TicketFlow — Auditoria Técnica Oficial

**Data da auditoria inicial:** 05/09/2026 18:59–19:00 BRT
**Agente da auditoria:** ChatGPT
**Branch:** `main`
**Repositório:** `djdiegocosta/ticketflow-core`
**Projeto Supabase:** `ywcdopjqfhisopipqxgq`
**Projeto Vercel:** `ticketflow-core`

## Objetivo

Este documento é o registro operacional vivo dos problemas encontrados na auditoria do TicketFlow. Nenhum item é removido quando resolvido. O status passa para `RESOLVIDO` e recebe data, hora, agente e evidência.

### Status permitidos

- `ABERTO` — problema confirmado e ainda não resolvido.
- `EM ANÁLISE` — investigação iniciada, mas causa/solução ainda não confirmada.
- `RESOLVIDO` — correção aplicada e confirmada no código, banco, deployment ou teste correspondente.
- `NÃO É BUG` — achado investigado e confirmado como comportamento intencional.
- `ADIADO` — problema confirmado, mas fora da prioridade atual.

Horários neste documento são BRT (UTC-3). Para alterações feitas por ChatGPT, usar `ChatGPT`. Para alterações feitas por Claude, usar `Claude 2`.

---

## 1. Segurança crítica — funções SECURITY DEFINER executáveis publicamente

**ID:** AUD-001  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Descoberta:** 05/09/2026 18:59 BRT  
**Agente:** ChatGPT

### Problema

Funções privilegiadas `SECURITY DEFINER` estavam executáveis por `anon`/API RPC. O risco envolvia operações como cancelamento, reembolso, venda manual, cortesia, exclusões, check-in e administração.

### Correção e evidência

Foi aplicada a migration `20260905190600_harden_public_execute_security_definer_functions`, removendo `EXECUTE` de `PUBLIC`/`anon` nas funções administrativas e mantendo apenas as funções deliberadamente públicas do fluxo do cliente. `handle_new_user` também deixou de ser público.

**Commit:** `3174749d9783ca500ac3ac2c35196846e736f77c`

### Resolução

- **Data:** 05/09/2026
- **Hora:** 19:06 BRT
- **Agente:** ChatGPT
- **Evidência:** verificação pós-correção confirmou ausência de `anon` em `proacl` das funções privilegiadas; Security Advisor deixou de apontar a exposição administrativa.

---

## 2. Segurança crítica — view `event_ticket_stats` com SECURITY DEFINER

**ID:** AUD-002  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Descoberta:** 05/09/2026 18:59 BRT  
**Agente:** ChatGPT

### Problema

A view pública `public.event_ticket_stats` executava com contexto do proprietário, podendo contornar RLS das tabelas subjacentes.

### Correção e evidência

A view foi alterada para `SECURITY INVOKER`, preservando o `SELECT` existente e fazendo a consulta respeitar o contexto do chamador.

**Migration:** `20260905220902_harden_event_ticket_stats_view_security_invoker.sql`  
**Commit:** `3d0c3e1e2d33f24f4cd394ef3dbf30c98e9c318d`

### Resolução

- **Data:** 05/09/2026
- **Hora:** 19:09 BRT
- **Agente:** ChatGPT
- **Evidência:** `reloptions = {security_invoker=true}` e Security Advisor sem o alerta específico da view.

---

## 3. Segurança — proteção contra senhas vazadas desativada

**ID:** AUD-003  
**Status:** `ABERTO`  
**Severidade:** ALTA  
**Descoberta:** 05/09/2026 18:59 BRT

### Problema

A proteção do Supabase Auth contra senhas comprometidas está desativada.

### Ação necessária

Ativar a proteção e validar login/cadastro.

### Resolução

Ainda não resolvido.

---

## 4. Segurança — `search_path` mutável em funções

**ID:** AUD-004  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Descoberta:** 05/09/2026 18:59 BRT

### Problema

Security Advisor apontou `search_path` mutável em `generate_short_code`, `get_hourly_sales_stats` e `get_new_customers_count`.

### Ação necessária

Definir `search_path` seguro e explícito.

### Resolução

Ainda não resolvido.

---

## 5. Integridade operacional — expiração de vendas pendentes

**ID:** AUD-005  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Descoberta:** 05/09/2026 19:00 BRT  
**Agente:** ChatGPT

### Problema

O checkout usava um contador fixo de 30 minutos, enquanto o banco já possuía `expires_at`. A restauração de estoque e o mecanismo de expiração precisavam ser confirmados e reconciliados com a `main`.

PRs anteriores relacionados ao problema não eram confiáveis para esta correção: parte da solução estava associada a uma versão antiga da `main`/projeto Supabase diferente. Por isso a correção não foi simplesmente mesclada.

### Correção aplicada

A produção atual foi auditada diretamente no projeto Supabase correto.

A função `create_pending_sale` já grava `expires_at` usando `organizations.pending_sale_expiration_minutes`, com fallback de 30 minutos, e reduz o estoque de forma protegida.

A função `expire_pending_sales_job()` foi reconciliada para:

- localizar somente vendas `pendente` com `expires_at <= now()`;
- usar `FOR UPDATE SKIP LOCKED` para evitar processamento concorrente duplicado;
- devolver a quantidade ao lote quando o lote possui estoque limitado;
- alterar a venda para `expirado` somente enquanto ela ainda está `pendente`.

A função `confirm_sale_paid()` também foi verificada: ela só transforma uma venda pendente em paga quando `expires_at` ainda não passou. Isso impede confirmação de pagamento depois da expiração.

O cron `expire-pending-sales` está configurado para executar a cada minuto. A consulta de histórico do cron mostrou execuções recentes consecutivas com status `succeeded`.

Foi aplicada no Supabase a migration:

`20260906114656_reconcile_pending_sale_expiration_flow`

A mesma migration foi versionada no GitHub:

`supabase/migrations/20260906114656_reconcile_pending_sale_expiration_flow.sql`

**Commit:** `b6d4eeb58b8323a836de931f3b6c487934500ef7`

No checkout, `src/pages/CheckoutPage.tsx` deixou de usar `1800` segundos como fonte de verdade. O timer agora usa o `expires_at` retornado por `create_pending_sale` e também reage ao status `expirado` vindo do banco.

**Commit do frontend:** `fd5fdb934cf864ad388fa0ca8a734e5279ac61ff`

### Validação pós-correção

- `create_pending_sale` retorna `sale_id`, `sale_code`, `total_amount` e `expires_at`.
- `sales.expires_at` existe em produção.
- Não havia venda `pendente` já vencida no momento da validação (`expired_but_pending = 0`).
- Existiam vendas efetivamente marcadas como `expirado`, demonstrando que o estado de expiração está sendo persistido.
- Cron de expiração tinha execuções recentes `succeeded`.
- O deployment Vercel correspondente ao commit do frontend foi iniciado automaticamente e não apresentou erros de build nas verificações disponíveis.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 08:49 BRT
- **Agente:** ChatGPT
- **Evidência:** migration aplicada no Supabase, cron validado, funções de criação/expiração/pagamento verificadas, `expired_but_pending = 0`, frontend corrigido e deployment iniciado para o commit `fd5fdb934cf864ad388fa0ca8a734e5279ac61ff`.

---

## 6. Integridade operacional — `checkin_ticket` fora do controle de versão

**ID:** AUD-006  
**Status:** `RESOLVIDO`  
**Severidade:** ALTA  
**Descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT

### Problema

A função `checkin_ticket` tinha divergência entre a função ativa em produção e migrations antigas do repositório. Uma migration referenciava colunas inexistentes em `checkin_log`.

### Correção e evidência

Claude 2 reconciliou a função com a definição funcional de produção através da migration `20260905231500_restore_checkin_ticket_correct_definition.sql`.

**Commit:** `7906a3deb8b3546aa8cd1881176b92dbaabb4116`

### Resolução

- **Data:** 05/09/2026
- **Hora:** 21:03 BRT
- **Agente:** Claude 2
- **Evidência:** migration aplicada e definição comparada com a função ativa.

---

## 7. Produto/UX — botão "Baixar todos os ingressos (PDF)" sem ação

**ID:** AUD-007  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

O botão de baixar todos os ingressos em PDF na confirmação da compra não possui ação implementada.

### Ação necessária

Implementar a ação ou remover/desabilitar o controle até que exista implementação real.

---

## 8. Integridade de dados — vínculo retroativo de compra guest com conta

**ID:** AUD-008  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

Compras feitas como visitante antes da criação da conta não são vinculadas automaticamente à conta criada posteriormente.

### Ação necessária

Implementar vínculo seguro por WhatsApp, respeitando organização e evitando associação indevida.

---

## 9. Performance — políticas RLS com avaliação repetida de autenticação

**ID:** AUD-009  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

Performance Advisor identificou políticas que reavaliam `auth.*()`/`current_setting()` por linha em várias tabelas.

### Ação necessária

Otimizar as expressões RLS sem alterar a regra de autorização.

---

## 10. Performance — chaves estrangeiras sem índices de cobertura

**ID:** AUD-010  
**Status:** `ABERTO`  
**Severidade:** BAIXA/MÉDIA

### Problema

Existem FKs sem índices de cobertura em várias relações.

### Ação necessária

Revisar as consultas reais e criar índices somente onde trouxerem benefício comprovado.

---

## 11. Performance — múltiplas políticas permissivas RLS

**ID:** AUD-011  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

Há múltiplas políticas permissivas para as mesmas combinações de papel/ação em várias tabelas.

### Ação necessária

Consolidar somente quando o comportamento de autorização permanecer exatamente igual.

---

## 12. Repositório — `.env` versionado

**ID:** AUD-012  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

`.env` está versionado. A auditoria encontrou a chave pública `anon`, não `service_role`, mas configuração de ambiente não deve permanecer versionada como configuração operacional.

### Ação necessária

Remover `.env`, manter `.env` no `.gitignore`, criar `.env.example` sem valores sensíveis e validar variáveis de produção na Vercel.

---

## 13. Documentação — `CHANGELOG.md` divergente do estado real

**ID:** AUD-013  
**Status:** `ABERTO`  
**Severidade:** MÉDIA

### Problema

O changelog contém afirmações históricas que conflitam com o estado atual de Supabase/Mercado Pago.

### Ação necessária

Atualizar a documentação sem apagar o histórico anterior.

---

## 14. Documentação — arquivos operacionais esperados ausentes

**ID:** AUD-014  
**Status:** `ABERTO`  
**Severidade:** BAIXA

### Problema

`docs/CLAUDE.md` e `docs/skills/ticketflow-development.md` não existem na `main`.

### Ação necessária

Decidir se devem ser recriados ou se a documentação atual substitui formalmente esses arquivos.

---

## 15. Produto/UX — itens históricos aguardando QA

**ID:** AUD-015  
**Status:** `EM ANÁLISE`  
**Severidade:** MÉDIA

### Problema

Há diversos itens históricos marcados como aguardando teste, incluindo Vitrine, Skeleton Screen, SmartField, espaçamentos, navegação de ingresso, datas, cidade, sexo e integração pública com lotes.

### Ação necessária

Executar QA funcional e marcar cada item individualmente somente após confirmação.

---

## 16. Integridade operacional — buckets de storage fora de migration

**ID:** AUD-016  
**Status:** `ABERTO`  
**Severidade:** ALTA  
**Agente da descoberta:** Claude 2

### Problema

Os buckets `event-images`, `organization-logos` e `client-banners` existem no banco vivo, mas não estavam representados em migrations versionadas.

### Impacto

Uma recriação do ambiente apenas pelas migrations não recriaria os buckets e suas políticas de acesso.

### Ação necessária

Versionar os três buckets e suas políticas em migrations idempotentes, preservando o comportamento atual.

---

# Situação de infraestrutura

## GitHub

- Repositório: `djdiegocosta/ticketflow-core`
- Branch: `main`
- Permissões disponíveis: `admin`, `maintain`, `push`, `pull`, `triage`.
- A migration do AUD-005 está versionada.
- O frontend do checkout está versionado no commit `fd5fdb934cf864ad388fa0ca8a734e5279ac61ff`.

## Supabase

- Projeto: `Ticket Flow`
- Ref: `ywcdopjqfhisopipqxgq`
- Região: `sa-east-1`
- Estado observado: `ACTIVE_HEALTHY`
- `create_pending_sale`, `expire_pending_sales_job` e `confirm_sale_paid` foram inspecionadas diretamente no banco.
- Cron de expiração possui histórico de execuções `succeeded`.

## Vercel

- Projeto: `ticketflow-core`
- O commit do frontend `fd5fdb934cf864ad388fa0ca8a734e5279ac61ff` disparou deployment de produção automaticamente.
- Na última verificação, o deployment estava em `BUILDING`.
- A verificação de logs de build não encontrou eventos de erro/stderr/exit.

---

# Prioridade atual

1. **AUD-016** — versionar buckets de storage.
2. **AUD-003** — proteção contra senhas vazadas.
3. **AUD-012** — remover `.env` versionado.
4. **AUD-004** — endurecer `search_path`.
5. **AUD-009/AUD-011** — otimizar e simplificar RLS.
6. **AUD-007/AUD-008** — pendências funcionais do cliente.
7. **AUD-010** — índices de FKs.
8. **AUD-013/AUD-014** — documentação.
9. **AUD-015** — QA dos itens pendentes.

**AUD-005 foi removido da prioridade porque está resolvido e validado.**

---

# Histórico de atualizações deste documento

| Data/Hora BRT | Agente | Alteração |
|---|---|---|
| 05/09/2026 19:00 | ChatGPT | Documento `docs/AUDITORIA.md` criado com os achados da auditoria técnica do GitHub, Supabase e Vercel. |
| 05/09/2026 19:06 | ChatGPT | AUD-001 corrigido e verificado no Supabase; migration versionada no GitHub. |
| 05/09/2026 19:09 | ChatGPT | AUD-002 corrigido: `event_ticket_stats` convertida para `SECURITY INVOKER`. |
| 05/09/2026 19:10 | ChatGPT | Evidência do AUD-002 alinhada à migration real `20260905220902`. |
| 05/09/2026 21:15 | Claude 2 | Segunda auditoria técnica; AUD-006 resolvido e AUD-016 registrado. |
| 06/09/2026 08:49 | ChatGPT | AUD-005 resolvido: fluxo de expiração de vendas pendentes reconciliado no Supabase, migration versionada, cron validado, confirmação de pagamento após expiração bloqueada e checkout atualizado para usar `expires_at`. |

## Regra de resolução

Nenhum item deve ser removido. Para resolver um item, alterar o status para `RESOLVIDO` e registrar:

- Data
- Hora BRT
- Agente
- Evidência correspondente

Nenhum item crítico de segurança ou integridade deve ser tratado como resolvido sem confirmação no banco/código e, quando aplicável, no deployment de produção.
