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

Funções privilegiadas `SECURITY DEFINER` estavam executáveis por `anon`/API RPC.

### Correção e evidência

Foi aplicada a migration `20260905190600_harden_public_execute_security_definer_functions`, removendo `EXECUTE` de `PUBLIC`/`anon` nas funções administrativas e mantendo apenas as funções deliberadamente públicas do fluxo do cliente.

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
**Status:** `ADIADO`  
**Severidade:** ALTA  
**Descoberta:** 05/09/2026 18:59 BRT

### Problema

A proteção do Supabase Auth contra senhas comprometidas está desativada.

### Ação necessária

Ativar a proteção e validar login/cadastro.

### Motivo do adiamento

Tentativa de ativação (06/09/2026) retornou erro: esse recurso (checagem via HaveIBeenPwned) só está disponível a partir do plano **Pro** do Supabase (US$25/mês por organização). O projeto está no plano **Free**. Diego optou por adiar o upgrade por enquanto.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 13:40 BRT
- **Agente:** Claude 2
- **Decisão:** Diego (dono do projeto), via Claude 2
- **Evidência:** mensagem de erro do painel Supabase confirmando exigência de plano Pro; organização `DC Eventos` confirmada em plano `free`.

---

## 4. Segurança — `search_path` mutável em funções

**ID:** AUD-004  
**Status:** `RESOLVIDO`  
**Severidade:** MÉDIA  
**Descoberta:** 05/09/2026 18:59 BRT

### Problema

Security Advisor apontou `search_path` mutável em `generate_short_code`, `get_hourly_sales_stats` e `get_new_customers_count`.

### Correção aplicada

O `search_path` das três funções foi fixado em vazio (`search_path = ''`), conforme recomendação do Supabase. Isso impede que a resolução de objetos dependa do `search_path` da sessão; as referências a objetos do projeto já estão qualificadas com `public.` quando necessário.

**Migration:** `20260906183000_harden_function_search_paths_aud004.sql`  
**Commit:** `f3d39db228504a8649116497b9927cb0a8fb6bad`

### Validação pós-correção

- `generate_short_code()` executou normalmente e retornou código válido.
- `get_new_customers_count(30)` executou normalmente.
- `get_hourly_sales_stats(NULL)` executou normalmente.
- As três funções passaram a apresentar `proconfig = {search_path=""}`.
- As funções continuam `SECURITY INVOKER`.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 15:27 BRT
- **Agente:** ChatGPT
- **Evidência:** migration aplicada no Supabase, funções verificadas em produção e chamadas de teste executadas com sucesso.

---

## 5. Integridade operacional — expiração de vendas pendentes

**ID:** AUD-005  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Descoberta:** 05/09/2026 19:00 BRT  
**Agente:** ChatGPT

### Problema

O checkout usava um contador fixo de 30 minutos, enquanto o banco já possuía `expires_at`.

### Correção e evidência

A produção foi reconciliada diretamente no projeto Supabase correto. `create_pending_sale` grava `expires_at`, `expire_pending_sales_job()` expira apenas vendas vencidas com bloqueio concorrente e devolve estoque, e `confirm_sale_paid()` impede confirmação após expiração. O cron `expire-pending-sales` executa a cada minuto.

**Migration:** `20260906114656_reconcile_pending_sale_expiration_flow`  
**Commit:** `b6d4eeb58b8323a836de931f3b6c487934500ef7`  
**Frontend:** `src/pages/CheckoutPage.tsx` passou a usar o `expires_at` do servidor.  
**Commit frontend:** `fd5fdb934cf864ad388fa0ca8a734e5279ac61ff`

### Resolução

- **Data:** 06/09/2026
- **Hora:** 08:49 BRT
- **Agente:** ChatGPT
- **Evidência:** migration aplicada, cron validado, funções verificadas, `expired_but_pending = 0`, frontend corrigido e deployment iniciado sem erro de build conhecido.

---

## 6. Integridade operacional — `checkin_ticket` fora do controle de versão

**ID:** AUD-006  
**Status:** `RESOLVIDO`  
**Severidade:** ALTA  
**Descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT

### Problema

A função `checkin_ticket` tinha divergência entre a função ativa em produção e migrations antigas do repositório.

### Correção e evidência

Claude 2 reconciliou a função através da migration `20260905231500_restore_checkin_ticket_correct_definition.sql`.

**Commit:** `7906a3deb8b3546aa8cd1881176b92dbaabb4116`

### Resolução

- **Data:** 05/09/2026
- **Hora:** 21:03 BRT
- **Agente:** Claude 2
- **Evidência:** migration aplicada e definição comparada com a função ativa.

---

## 7. Produto/UX — botão "Baixar todos os ingressos (PDF)" sem ação

**ID:** AUD-007  
**Status:** `RESOLVIDO`  
**Severidade:** MÉDIA  
**Descoberta:** 05/09/2026

### Problema

O botão de baixar todos os ingressos em PDF na confirmação da compra não possuía ação implementada.

### Correção aplicada

A página `src/pages/ConfirmationPage.tsx` passou a gerar e baixar um PDF real usando a dependência `jspdf` já existente no projeto.

O PDF é gerado com um ingresso por página, contendo identificação TicketFlow, nome e data do evento, participante, número do ingresso, QR Code individual, código do ingresso e orientação para apresentação na entrada.

A geração usa os QR Codes já renderizados na confirmação. O botão apresenta estado de processamento (`Gerando PDF...`) e fica desabilitado durante a geração.

**Arquivo:** `src/pages/ConfirmationPage.tsx`  
**Commit:** `c75d7d1e188af96eb2d7ec1908494111ef7f7599`

### Resolução

- **Data:** 06/09/2026
- **Hora:** 15:08 BRT
- **Agente:** ChatGPT
- **Evidência:** implementação versionada no `main`; `jspdf` já estava declarado em `package.json`; a função percorre todos os ingressos, gera uma página por ingresso e executa `pdf.save()`.

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
**Status:** `RESOLVIDO`  
**Severidade:** MÉDIA

### Problema

`.env` estava versionado, contendo `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` e as variantes `VITE_*`. A auditoria encontrou a chave pública `anon`, não `service_role`.

### Correção aplicada

- `.env` removido do repositório.
- `.env` e variantes (`*.local`) adicionados ao `.gitignore`.
- `.env.example` criado, sem valores sensíveis.
- Variáveis reais permanecem configuradas na Vercel.

**Commit de remoção do `.env`:** `fad914de83eb89c3ee289a1fec09567cc3369a4f`

### Validação pós-correção

- Build de produção na Vercel concluído com `READY` após a remoção (`dpl_AZfkXQtGWF7F7tcyCQa1pBgjpZ69`).
- Nenhum erro de runtime nos 10 minutos seguintes ao deploy.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 15:35 BRT
- **Agente:** Claude 2
- **Evidência:** deploy `READY`, sem erros de runtime; variáveis reais confirmadas na Vercel antes da remoção.

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
**Status:** `RESOLVIDO`  
**Severidade:** ALTA  
**Descoberta:** 05/09/2026 21:15 BRT  
**Agente da descoberta:** Claude 2

### Problema

Os buckets `event-images`, `organization-logos` e `client-banners` existiam no banco vivo, mas não estavam representados em migrations versionadas. Suas políticas de acesso também não estavam versionadas de forma explícita.

### Correção aplicada

Os três buckets foram versionados com definição idempotente, preservando o estado atual. As oito políticas de `storage.objects` existentes para esses buckets também foram versionadas, preservando as regras atuais de leitura pública e upload/alteração/remoção administrativa.

Migrations aplicadas no Supabase:

- `20260906120059_version_storage_buckets`
- `20260906120129_version_storage_bucket_policies`

Migrations versionadas no GitHub:

- `supabase/migrations/20260906130000_version_storage_buckets.sql`
- `supabase/migrations/20260906130100_version_storage_bucket_policies.sql`

**Commits:**

- `f7f182e9199d18eb93737a4365927cf3332c1ff6`
- `38cb6bf017b44df1b244983d62c08b3db287bb45`

### Validação pós-correção

- Os três buckets permanecem presentes em produção.
- A configuração pública foi preservada.
- As oito políticas esperadas permanecem presentes em `storage.objects`.
- As migrations correspondentes foram registradas no histórico do Supabase.
- As migrations foram adicionadas ao repositório `main`.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 09:02 BRT
- **Agente:** ChatGPT
- **Evidência:** migrations aplicadas e versionadas; buckets e políticas conferidos diretamente em produção.

---

## 17. Integridade operacional — PDF de check-in incluía vendas pendentes/canceladas

**ID:** AUD-017  
**Status:** `RESOLVIDO`  
**Severidade:** ALTA  
**Descoberta:** 06/09/2026 14:50 BRT  
**Agente da descoberta:** Diego (reportado diretamente)

### Problema

O botão "PDF" da lista de vendas (`src/pages/admin/SalesListPage.tsx`) gera a lista de check-in usada como substituto manual quando o check-in automático falha. O filtro só excluía vendas com `status = 'cancelado'`, deixando vazar `pendente` e `expirado` (e futuramente `reembolsado`) para a lista impressa na portaria.

### Impacto

Pessoas com venda pendente/expirada poderiam ser liberadas na entrada do evento por constarem na lista impressa, mesmo sem ingresso válido.

### Correção aplicada

Filtro alterado para incluir apenas `status === 'pago'` ou `is_courtesy === true`. Confirmado no banco que cortesias sempre nascem com `status = 'pago'` (função `create_courtesy`), então a condição cobre exatamente vendas válidas e cortesias.

**Arquivo:** `src/pages/admin/SalesListPage.tsx`  
**Commit:** `e0bfbe57d431a56234600990c71248de215b1105`

### Validação pós-correção

- Deploy `dpl_7mv2uLmpw24dSsr5jLzuuoC7fMf9` concluído com `READY`.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 14:58 BRT
- **Agente:** Claude 2
- **Evidência:** filtro corrigido e versionado; deploy validado sem erro.

---

# Situação de infraestrutura

## GitHub

- Repositório: `djdiegocosta/ticketflow-core`
- Branch: `main`
- Permissões disponíveis: `admin`, `maintain`, `push`, `pull`, `triage`.
- Migrations de segurança, expiração e Storage estão versionadas.

## Supabase

- Projeto: `Ticket Flow`
- Ref: `ywcdopjqfhisopipqxgq`
- Região: `sa-east-1`
- Estado observado: `ACTIVE_HEALTHY`
- Buckets do AUD-016 e respectivas políticas estão versionados e presentes em produção.

## Vercel

- Projeto: `ticketflow-core`
- Deployment do frontend do AUD-005 foi iniciado e o build foi concluído sem erro conhecido na verificação realizada.
- O estado final do deployment deve ser rechecado quando necessário.

# Prioridade atual

1. **AUD-009 / AUD-011** — otimizar e simplificar RLS.
2. **AUD-008** — corrigir pendência funcional do cliente (vínculo retroativo guest).
3. **AUD-010** — revisar índices de FKs.
4. **AUD-013 / AUD-014** — documentação.
5. **AUD-015** — QA funcional.

AUD-001, AUD-002, AUD-004, AUD-005, AUD-006, AUD-007, AUD-012, AUD-016 e AUD-017 estão fora da fila de correção por já estarem resolvidos.  
AUD-003 está fora da fila ativa por estar `ADIADO` (depende de upgrade de plano pago do Supabase).

---

# Histórico de alterações deste documento

| Data | Hora BRT | Agente | ID | Alteração |
|---|---:|---|---|---|
| 05/09/2026 | 18:59–19:00 | ChatGPT | — | Auditoria inicial registrada. |
| 05/09/2026 | 19:06 | ChatGPT | AUD-001 | Funções administrativas SECURITY DEFINER deixaram de ser executáveis por `anon`. |
| 05/09/2026 | 19:09 | ChatGPT | AUD-002 | View `event_ticket_stats` alterada para SECURITY INVOKER. |
| 05/09/2026 | 21:15 | Claude 2 | AUD-016 | Identificada ausência de versionamento dos buckets Storage. |
| 06/09/2026 | 08:49 | ChatGPT | AUD-005 | Fluxo de expiração de vendas pendentes reconciliado e frontend corrigido. |
| 06/09/2026 | 09:02 | ChatGPT | AUD-016 | Buckets e políticas Storage versionados e validados em produção. |
| 06/09/2026 | 13:40 | Claude 2 | AUD-003 | Marcado como ADIADO — recurso exige plano Pro do Supabase; Diego optou por adiar o upgrade. |
| 06/09/2026 | 14:58 | Claude 2 | AUD-017 | PDF de check-in da lista de vendas corrigido para incluir só vendas pagas/cortesias. |
| 06/09/2026 | 15:08 | ChatGPT | AUD-007 | Botão de download de todos os ingressos passou a gerar PDF real, com um ingresso por página e QR Code individual. |
| 06/09/2026 | 15:27 | ChatGPT | AUD-004 | `search_path` das três funções do achado foi fixado em vazio e validado em produção. |
| 06/09/2026 | 15:35 | Claude 2 | AUD-012 | `.env` removido do repositório, `.gitignore` e `.env.example` atualizados, build validado. |

**Regra permanente:** problemas resolvidos não devem ser apagados deste documento. Apenas seu status é alterado para `RESOLVIDO`, com data, hora, agente e evidência.
