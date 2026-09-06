# TicketFlow — Auditoria Técnica Oficial

**Data da auditoria:** 05/09/2026 18:59–19:00 BRT (horário de observação dos serviços)
**Agente da auditoria:** ChatGPT
**Branch auditada:** `main`
**Commit de referência do mapa do projeto:** `c5cd08718eac4f0a15fa1f97133bfa14ffaa2691`
**Repositório:** `djdiegocosta/ticketflow-core`
**Projeto Supabase:** `ywcdopjqfhisopipqxgq`
**Projeto Vercel:** `ticketflow-core`

## Objetivo

Registrar de forma permanente os problemas técnicos encontrados na auditoria do TicketFlow, permitindo acompanhar cada problema desde a descoberta até a resolução.

Este documento é um **registro operacional vivo**. Nenhum item deve ser removido quando for resolvido. O status deve ser alterado para `RESOLVIDO` e deve ser acrescentado um registro com **data, hora e agente responsável**.

## Regras deste documento

- `ABERTO` — problema confirmado e ainda não resolvido.
- `EM ANÁLISE` — investigação iniciada, mas a causa ou solução ainda não foi confirmada.
- `RESOLVIDO` — correção aplicada e confirmada no código, banco, deployment ou teste correspondente.
- `NÃO É BUG` — achado investigado e confirmado como comportamento intencional.
- `ADIADO` — problema confirmado, mas fora da prioridade operacional atual.
- Nunca marcar como `RESOLVIDO` apenas porque uma correção foi proposta.
- Quando outro agente resolver um item, registrar o nome identificável do agente no histórico.
- Para alterações futuras feitas por ChatGPT, usar `ChatGPT` como agente responsável.
- Para alterações futuras feitas por Claude, usar `Claude 2` como agente responsável.
- Horários devem ser registrados em **BRT (UTC-3)**.

---

## 1. Segurança crítica — funções SECURITY DEFINER executáveis publicamente

**ID:** AUD-001  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Data de descoberta:** 05/09/2026 18:59 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Supabase Security Advisor identificou diversas funções `SECURITY DEFINER` expostas para `anon` e/ou `authenticated` através da API RPC. `SECURITY DEFINER` faz a função executar com os privilégios do proprietário, portanto a exposição precisa ser intencional e protegida.

As funções identificadas incluem operações sensíveis como cancelamento, reembolso, criação de venda manual, criação de cortesia, exclusão de cliente/evento, check-in, convites e atualização de organização.

Funções relevantes detectadas:

- `award_points`
- `cancel_event`
- `cancel_sale`
- `checkin_ticket`
- `create_courtesy`
- `create_manual_sale`
- `create_mp_test_sale`
- `create_pending_sale`
- `delete_courtesy_ticket`
- `delete_customer`
- `delete_event`
- `draw_raffle_winner`
- `invite_user`
- `refund_sale`
- `remove_user_or_invite`
- `signup_customer`
- `track_checkout_abandonment`
- `update_courtesy_participant`
- `update_customer`
- `update_organization_profile`
- além de funções auxiliares como `has_role`, `get_user_organization`, `get_default_organization` e outras funções de leitura.

### Impacto

Risco de execução indevida de operações privilegiadas caso as próprias funções não façam validação rigorosa de autenticação, papel e organização.

### Correção aplicada

Foi aplicada uma migration específica para remover `EXECUTE` de `anon` nas funções privilegiadas e administrativas. A correção preserva as funções que precisam permanecer públicas para o fluxo de compra/consulta do cliente.

Também foi removida a execução pública de `handle_new_user`, que é função interna de infraestrutura, mantendo sua execução para `service_role`.

As funções administrativas continuam disponíveis para `authenticated` e `service_role`, porque o painel administrativo depende delas. A proteção de autorização interna por usuário, papel e organização permanece necessária e continua sendo responsabilidade das próprias funções.

### Evidência

- Migration Supabase: `20260905190600_harden_public_execute_security_definer_functions`
- Commit GitHub: `3174749d9783ca500ac3ac2c35196846e736f77c`
- Verificação pós-correção confirmou que as funções privilegiadas listadas não possuem mais `anon` em `proacl`.
- `handle_new_user` ficou disponível somente para `postgres`/`service_role`.
- O Security Advisor deixou de apontar as funções administrativas anteriormente expostas a `anon`. Permanecem alertas para funções deliberadamente públicas do fluxo de cliente e para funções executáveis por `authenticated`, que serão tratadas conforme o escopo de cada item.

### Registro de resolução

- **Data:** 05/09/2026
- **Hora:** 19:06 BRT
- **Agente:** ChatGPT
- **Ação:** correção aplicada no Supabase e migration versionada no GitHub.

---

## 2. Segurança crítica — view `event_ticket_stats` com SECURITY DEFINER

**ID:** AUD-002  
**Status:** `RESOLVIDO`  
**Severidade:** CRÍTICA  
**Data de descoberta:** 05/09/2026 18:59 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Security Advisor detectou a view `public.event_ticket_stats` definida com `SECURITY DEFINER`.

### Impacto

A view podia aplicar permissões e RLS do proprietário da view, e não necessariamente do usuário que consulta. Como a view possui `SELECT` para `anon` e `authenticated`, havia risco de exposição de dados das tabelas subjacentes (`sales` e `tickets`) fora das políticas RLS do chamador.

### Correção aplicada

A view foi alterada para `SECURITY INVOKER`. Isso mantém a view disponível para o fluxo existente, mas faz a consulta respeitar as permissões e as políticas RLS do papel que está realizando a chamada.

A definição funcional da view não foi alterada: continuam sendo calculadas as estatísticas de ingressos vendidos, cortesias e check-ins agrupadas por evento e organização.

### Evidência

- Definição anterior confirmada no banco: `public.event_ticket_stats` com `reloptions = null` e proprietário `postgres`.
- Verificação posterior confirmou `reloptions = {security_invoker=true}`.
- `anon` e `authenticated` continuam com permissão `SELECT`; a diferença é que a execução agora respeita o contexto do chamador.
- O Security Advisor deixou de reportar o alerta específico da view `event_ticket_stats`.
- Migration Supabase: `harden_event_ticket_stats_view_security_invoker` (versão `20260905220902`)
- Migration versionada no GitHub: `supabase/migrations/20260905220902_harden_event_ticket_stats_view_security_invoker.sql`
- Commit GitHub que alinhou a migration ao número real aplicado no Supabase: `3d0c3e1e2d33f24f4cd394ef3dbf30c98e9c318d`

### Registro de resolução

- **Data:** 05/09/2026
- **Hora:** 19:09 BRT
- **Agente:** ChatGPT
- **Ação:** view convertida para `SECURITY INVOKER`, verificada no banco e validada novamente pelo Security Advisor.

---

## 3. Segurança — proteção contra senhas vazadas desativada

**ID:** AUD-003  
**Status:** `ABERTO`  
**Severidade:** ALTA  
**Data de descoberta:** 05/09/2026 18:59 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Supabase Auth está com a proteção contra senhas comprometidas desativada.

### Impacto

Contas podem aceitar senhas que já foram identificadas em vazamentos conhecidos.

### Ação necessária

Ativar a proteção de senhas vazadas no Supabase Auth e validar o fluxo de login/cadastro após a alteração.

### Registro de resolução

Ainda não resolvido.

---

## 4. Segurança — `search_path` mutável em funções

**ID:** AUD-004  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 18:59 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Security Advisor identificou `search_path` mutável nas funções:

- `generate_short_code`
- `get_hourly_sales_stats`
- `get_new_customers_count`

### Impacto

Funções que dependem de resolução de objetos pelo `search_path` podem ficar sujeitas a resolução inesperada de objetos, especialmente em funções privilegiadas.

### Ação necessária

Definir `search_path` seguro e explícito nas funções, preferencialmente restringindo a resolução aos schemas necessários.

### Registro de resolução

Ainda não resolvido.

---

## 5. Integridade operacional — expiração de vendas pendentes ainda não confirmada na `main`

**ID:** AUD-005  
**Status:** `ABERTO`  
**Severidade:** CRÍTICA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O `PROJECT-MAP.md` informa que o hardening da expiração de vendas pendentes, incluindo restauração de estoque, uso correto de `expires_at` no timer e correção do cron, continua **NÃO MERGED** na `main`.

Existem PRs abertos relacionados a esse escopo, mas a correção não pode ser considerada parte do ambiente de produção enquanto não estiver mesclada e confirmada.

### Impacto

Uma venda pendente expirada pode continuar afetando a reserva de estoque ou apresentar comportamento divergente entre o contador do checkout e o estado real do banco.

### Ação necessária

Revisar a solução consolidada atual, mesclar somente a correção compatível com a `main` e validar:

- criação da venda pendente;
- `expires_at`;
- expiração;
- liberação do estoque;
- comportamento do checkout;
- execução periódica do mecanismo de limpeza.

### Registro de resolução

Ainda não resolvido.

---

## 6. Integridade operacional — `checkin_ticket` fora do controle de versão

**ID:** AUD-006  
**Status:** `RESOLVIDO`  
**Severidade:** ALTA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

A função `checkin_ticket` existe no banco vivo, mas não está garantidamente representada por migration versionada na `main`, conforme documentação operacional atual.

Investigação mais profunda (Claude 2, 05/09/2026) encontrou uma causa mais específica: a função **já existia** em duas migrations (`20260901120000_baseline_functions_snapshot.sql` e `20260903050000_harden_admin_operations.sql`), mas a versão da migration mais recente usava colunas (`ticket_id`, `checked_by`) que não existem na tabela real `checkin_log` (`organization_id`, `event_id`, `participant_name`, `result`, `performed_by`). A função realmente ativa em produção era uma versão anterior, com assinatura e corpo diferentes, nunca reconciliada no histórico de migrations.

### Impacto

O banco de produção estava divergente do banco reproduzível pelo repositório. Uma recriação/restauração do ambiente a partir das migrations instalaria a versão quebrada (referenciando colunas inexistentes) e o check-in do evento pararia de funcionar.

### Correção aplicada

Nova migration idempotente aplicada no Supabase e versionada no GitHub, recriando `checkin_ticket` com a definição real e funcional que já estava em produção (mesma lógica, mesmas colunas de `checkin_log`, mesmo `REVOKE EXECUTE` de `anon`/`PUBLIC`). Nenhuma mudança de comportamento em produção — apenas reconciliação entre repositório e banco.

### Evidência

- Migration Supabase aplicada: `restore_checkin_ticket_correct_definition`
- Migration versionada no GitHub: `supabase/migrations/20260905231500_restore_checkin_ticket_correct_definition.sql`
- Commit GitHub: `7906a3deb8b3546aa8cd1881176b92dbaabb4116`
- Verificação pós-correção: definição da função no banco comparada byte a byte com o arquivo de migration, idênticas.
- Documentação histórica (`docs/AUDITORIA-STATUS.md`) e `docs/CHANGELOG.md` atualizados no mesmo commit/rodada com a explicação da causa raiz.

### Registro de resolução

- **Data:** 05/09/2026
- **Hora:** 21:03 BRT
- **Agente:** Claude 2
- **Ação:** causa raiz investigada, migration de reconciliação aplicada no Supabase e versionada no GitHub, documentação histórica atualizada.

---

## 7. Produto/UX — botão "Baixar todos os ingressos (PDF)" sem ação

**ID:** AUD-007  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

A documentação de auditoria registra que o botão de baixar todos os ingressos em PDF na confirmação da compra ainda não possui ação implementada.

### Impacto

O usuário pode clicar em uma ação apresentada como disponível sem receber o resultado esperado.

### Ação necessária

Implementar a ação ou, enquanto não implementada, remover/desabilitar o controle para não apresentar funcionalidade falsa.

### Registro de resolução

Ainda não resolvido.

---

## 8. Integridade de dados — vínculo retroativo de compra guest com conta

**ID:** AUD-008  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

Compras feitas como visitante antes da criação da conta não são vinculadas automaticamente à conta criada posteriormente. O vínculo só ocorre para fluxos posteriores à correção já aplicada.

### Impacto

O cliente pode criar uma conta e não encontrar no histórico os ingressos adquiridos anteriormente com o mesmo WhatsApp.

### Ação necessária

Definir e implementar vínculo seguro por WhatsApp, evitando associação indevida entre pessoas e mantendo a separação por organização.

### Registro de resolução

Ainda não resolvido.

---

## 9. Performance — políticas RLS com avaliação repetida de funções de autenticação

**ID:** AUD-009  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Performance Advisor identificou várias políticas RLS que reavaliam `auth.*()`/`current_setting()` por linha. O padrão recomendado é encapsular a chamada em `(select auth.<function>())` quando aplicável.

As ocorrências abrangem, entre outras, `organizations`, `profiles`, `user_roles`, `events`, `ticket_batches`, `sales`, `tickets`, `customers`, `mp_config`, `checkout_rate_limits`, `checkout_abandonments`, `client_banners`, `points_ledger`, `checkin_log`, `event_checklist_items`, `simulations`, `raffles` e tabelas auxiliares.

### Impacto

Pode gerar custo desnecessário de avaliação das políticas conforme o volume de dados cresce.

### Ação necessária

Revisar as políticas afetadas e aplicar a forma otimizada sem alterar a regra de autorização.

### Registro de resolução

Ainda não resolvido.

---

## 10. Performance — chaves estrangeiras sem índices de cobertura

**ID:** AUD-010  
**Status:** `ABERTO`  
**Severidade:** BAIXA/MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O Performance Advisor identificou chaves estrangeiras sem índice de cobertura, incluindo relações em `checkin_log`, `diagnostic_logs`, `event_checklist_items`, `events`, `pending_invites`, `points_ledger`, `raffles`, `raffle_winners`, `sales`, `sales_links`, `ticket_batches`, `tickets` e `user_roles`.

### Impacto

Pode degradar consultas e operações de manutenção de relações conforme o volume de dados crescer.

### Ação necessária

Revisar cada relação contra as consultas reais antes de criar índices. Não criar índices indiscriminadamente.

### Registro de resolução

Ainda não resolvido.

---

## 11. Performance — múltiplas políticas permissivas RLS

**ID:** AUD-011  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

Foram detectadas múltiplas políticas permissivas para a mesma combinação de papel/ação em tabelas como `checkout_rate_limits`, `client_banners`, `customers`, `events`, `mp_config`, `points_ledger`, `sales`, `ticket_batches`, `tickets` e `user_roles`.

### Impacto

Cada política permissiva relevante pode precisar ser avaliada, aumentando o custo das consultas e dificultando a manutenção das regras de acesso.

### Ação necessária

Consolidar políticas somente quando isso preservar exatamente o mesmo comportamento de autorização. Segurança tem prioridade sobre otimização.

### Registro de resolução

Ainda não resolvido.

---

## 12. Repositório — `.env` versionado

**ID:** AUD-012  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

O arquivo `.env` está versionado na raiz do repositório `main`.

O conteúdo auditado contém identificadores e a chave pública do Supabase. A chave encontrada é uma chave de publicação (`anon`), não uma `service_role` key, mas o arquivo ainda representa configuração de ambiente que não deveria ser mantida como segredo/configuração operacional versionada.

### Impacto

Aumenta o risco de configuração acidental, dificulta a separação entre ambiente local e produção e pode criar risco grave se algum segredo for adicionado ao mesmo arquivo no futuro.

### Ação necessária

Remover `.env` do controle de versão, garantir `.env` no `.gitignore` e manter somente um `.env.example` com nomes de variáveis sem valores sensíveis. Validar que as variáveis de produção permanecem configuradas na Vercel.

### Registro de resolução

Ainda não resolvido.

---

## 13. Documentação — `CHANGELOG.md` diverge do estado real da infraestrutura

**ID:** AUD-013  
**Status:** `ABERTO`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

`docs/CHANGELOG.md` ainda informa que a conexão real com Supabase e Mercado Pago não foi realizada, enquanto o `PROJECT-MAP.md` e a infraestrutura auditada confirmam que o projeto está conectado ao Supabase e que o fluxo Mercado Pago possui implementação na `main`.

### Impacto

Agentes e desenvolvedores podem tomar decisões com base em um estado histórico incorreto.

### Ação necessária

Atualizar o changelog/documentação histórica para refletir o estado atual, sem apagar o histórico anterior.

### Registro de resolução

Ainda não resolvido.

---

## 14. Documentação — arquivos operacionais esperados não existem

**ID:** AUD-014  
**Status:** `ABERTO`  
**Severidade:** BAIXA  
**Data de descoberta:** 05/09/2026 18:59 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

Foram procurados `docs/CLAUDE.md` e `docs/skills/ticketflow-development.md`, mas ambos retornaram `404` no branch `main`.

O repositório possui `AGENTS.md` na raiz, que orienta os agentes a preservar o histórico publicado e manter a branch conectada ao Lovable em estado funcional.

### Impacto

A ausência desses documentos não quebra o sistema, mas reduz a padronização do processo para agentes futuros.

### Ação necessária

Decidir se esses documentos continuam sendo necessários. Se forem, recriá-los em versão compatível com a documentação atual. Se não forem mais necessários, registrar formalmente essa decisão em documentação do projeto.

### Registro de resolução

Ainda não resolvido.

---

## 15. Produto/UX — itens históricos aguardando confirmação de teste

**ID:** AUD-015  
**Status:** `EM ANÁLISE`  
**Severidade:** MÉDIA  
**Data de descoberta:** 05/09/2026 19:00 BRT  
**Agente da descoberta:** ChatGPT  

### Problema

A documentação histórica contém diversos itens marcados como `⏳`, indicando que uma correção foi entregue, mas ainda depende de teste/confirmação. Entre eles estão ajustes da Vitrine, Skeleton Screen, SmartField, espaçamentos, link de retorno do ingresso, selo de status, máscara/entrada de datas, cidade, campo sexo, conexão da tela pública com lotes disponíveis e outros refinamentos de UX.

### Impacto

Não é possível considerar esses itens confirmados apenas pela existência do código ou pelo registro histórico do prompt.

### Ação necessária

Executar uma rodada de QA funcional das áreas prioritárias e alterar cada item individualmente para `RESOLVIDO` somente após confirmação.

### Registro de resolução

Ainda não resolvido.

---

## 16. Integridade operacional — buckets de storage criados fora de migration

**ID:** AUD-016  
**Status:** `ABERTO`  
**Severidade:** ALTA  
**Data de descoberta:** 05/09/2026 21:10 BRT  
**Agente da descoberta:** Claude 2  

### Problema

Os três buckets de storage em uso pelo projeto (`event-images`, `organization-logos`, `client-banners`) existem no banco ao vivo, mas nenhum deles está representado em migration versionada. Buscas por `storage.buckets` em todo o histórico de `supabase/migrations` não retornaram nenhuma ocorrência.

### Impacto

Mesmo risco identificado no AUD-006 antes da correção: uma recriação/restauração do ambiente a partir das migrations não recriaria os buckets nem suas políticas de acesso (upload de logo, imagens de evento, banners da Vitrine deixariam de funcionar até alguém recriar manualmente cada bucket e política).

### Ação necessária

Criar migration(s) versionada(s) contendo `insert into storage.buckets` para os três buckets (com a mesma flag `public` já configurada) e as `CREATE POLICY` correspondentes hoje ativas em `storage.objects` para cada um. Migration deve ser idempotente (`ON CONFLICT DO NOTHING` ou equivalente) para não falhar caso os buckets já existam.

### Registro de resolução

Ainda não resolvido.

---

# Situação da infraestrutura na data da auditoria

## GitHub

- Repositório correto acessado: `djdiegocosta/ticketflow-core`.
- Branch auditada: `main`.
- Permissões disponíveis para o agente: `admin`, `maintain`, `push`, `pull` e `triage`.
- O repositório está conectado ao Lovable. Alterações publicadas na branch conectada sincronizam com o Lovable, conforme `AGENTS.md`.
- **Recheck Claude 2, 05/09/2026 21:15 BRT:** commit atual da `main` é `b4136923e157b5ff7bb66bfe2834eb29f4bdd4fa`. `.env` continua versionado na raiz (AUD-012 ainda aberto). Quatro PRs abertos contra `main`: #7 (botão PDF, AUD-007), #12 e #13 (hardening/expiração — parecem ter sido superados por #15), #15 "consolidate payment and pending-sale hardening" (mais recente, provável candidato único a mesclar para resolver AUD-005). Nenhum PR foi mesclado nesta rodada.

## Supabase

- Projeto correto: `Ticket Flow`.
- Project ref: `ywcdopjqfhisopipqxgq`.
- Estado observado: `ACTIVE_HEALTHY`.
- Região: São Paulo (`sa-east-1`).
- Todas as tabelas públicas verificadas pelo catálogo retornaram RLS habilitado.
- O Security Advisor encontrou os problemas registrados acima.
- O Performance Advisor encontrou os problemas de performance registrados acima.
- **Recheck Claude 2, 05/09/2026 21:15 BRT:** Security Advisor e Performance Advisor reconsultados do zero; achados batem exatamente com AUD-003/004/009/010/011, sem itens novos nessas categorias. Função `create_mp_test_sale` (aparece no advisor como exposta a `authenticated`) foi inspecionada linha a linha: possui checagem interna de `has_role(auth.uid(),'admin')` e de organização — não é uma vulnerabilidade nova, é o mesmo padrão de proteção interna já aceito no AUD-001. Buckets de storage auditados e registrados no novo item AUD-016.

## Vercel

- Projeto: `ticketflow-core`.
- O deployment de produção auditado está em estado `READY`.
- A produção estava apontando para a `main` no commit `df77760fb82d65198e00b9b65d64b05fb8a0bf8b` no momento da consulta.
- Não foram encontrados erros de runtime agrupados por rota no período de 7 dias consultado para esse deployment.
- **Recheck Claude 2, 05/09/2026 21:15 BRT:** projeto e deployment de produção seguem `READY` (`dpl_EDVcC1JDfdiGazg4Ahv5XNHGpjJ2`). Nenhum erro de runtime nos últimos 7 dias. Nada de novo a registrar.

---

# Prioridade de correção

1. **AUD-005 — Expiração/liberação de estoque de vendas pendentes.** PR #15 é o candidato consolidado a mesclar.
2. **AUD-016 — Versionar buckets de storage (`event-images`, `organization-logos`, `client-banners`).**
3. **AUD-003 — Proteção contra senhas vazadas.**
4. **AUD-012 — Remoção do `.env` versionado.**
5. **AUD-004 — `search_path` das funções.**
6. **AUD-009/AUD-011 — otimização e simplificação das políticas RLS.**
7. **AUD-007/AUD-008 — pendências funcionais do fluxo do cliente.**
8. **AUD-010 — índices de chaves estrangeiras.**
9. **AUD-013/AUD-014 — saneamento da documentação.**
10. **AUD-015 — QA dos itens ainda não confirmados.**

> ✅ **AUD-006 resolvido nesta rodada** (Claude 2) — removido da lista de prioridades ativas.

> **Regra operacional:** nenhum item crítico de segurança ou integridade deve ser tratado como resolvido sem confirmação no banco/código e, quando aplicável, em deployment de produção.

## Histórico de atualizações deste documento

| Data/Hora BRT | Agente | Alteração |
|---|---|---|
| 05/09/2026 19:00 | ChatGPT | Documento `docs/AUDITORIA.md` criado com os achados da auditoria técnica do GitHub, Supabase e Vercel. |
| 05/09/2026 19:06 | ChatGPT | AUD-001 corrigido: removida execução `anon` das funções SECURITY DEFINER privilegiadas e registrado o resultado da verificação pós-correção. |
| 05/09/2026 19:09 | ChatGPT | AUD-002 corrigido: `event_ticket_stats` convertida para `SECURITY INVOKER`, verificada no banco e retirada do Security Advisor. |
| 05/09/2026 19:10 | ChatGPT | Corrigida a documentação do AUD-002 para refletir a versão real da migration aplicada no Supabase (`20260905220902`) e alinhada a migration versionada no GitHub. |
| 05/09/2026 21:15 | Claude 2 | Segunda auditoria técnica cruzando GitHub + Supabase + Vercel: reconfirmados AUD-003, AUD-004, AUD-005, AUD-007 a AUD-015 (sem mudança); AUD-006 investigado a fundo e corrigido (causa raiz era divergência de migration, não ausência); novo item AUD-016 registrado (buckets de storage fora de migration); seções "Situação da infraestrutura" e "Prioridade de correção" atualizadas com o estado observado nesta data/hora. |

## Como registrar uma resolução

Ao solucionar um item, manter o item no documento e alterar somente o necessário para refletir o novo estado:

```text
**Status:** `RESOLVIDO`

### Registro de resolução

- **Data:** DD/MM/AAAA
- **Hora:** HH:MM BRT
- **Agente:** ChatGPT
- **Evidência:** commit, migration, PR, teste, deployment ou verificação correspondente.
```

Se o problema for resolvido por outro agente, substituir `ChatGPT` pelo identificador desse agente e manter a evidência da alteração.
