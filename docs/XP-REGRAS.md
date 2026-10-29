# TicketFlow — Regras de XP (v3)

**Fonte única:** `xp_expected_ledger()` (quanto cada cliente DEVE ter) e `xp_rule_amount()` (valores), no banco.
`rebuild_customer_xp()` acerta o ledger `customer_xp_events` com o esperado. Gatilhos só chamam essa função.
Migration: `supabase/migrations/20261028230000_xp_rules_v3_single_ledger.sql` · Testes: `supabase/tests/xp_rules_v3.sql`
· Desfazer: `supabase/rollbacks/20261028230000_xp_rules_v3_rollback.sql`.

## Valores
| Ação | XP | Motivo no banco |
|---|---:|---|
| Criação de conta | +50 | `criar_conta` |
| Cada compra paga (por transação) | +200 | `compra_ingresso` |
| Primeira compra paga | +50 | `primeira_compra` |
| Check-in válido (por evento) | +50 | `comparecimento` |
| Primeiro comprador do evento | +100 | `primeiro_comprador` |
| Compra no primeiro dia de vendas | +50 | `compra_primeiro_dia` |
| Compra adicional no mesmo evento | +50 | `compra_adicional` |
| 3+ ingressos na mesma transação | +100 | `compra_grupo` |
| 3 eventos concluídos seguidos | +200 | `fidelidade` |

Para mudar um valor: altere só `xp_rule_amount()` e rode `select * from rebuild_customer_xp();`.

## Quem ganha XP (elegibilidade)
- Só cliente **com conta** (`customers.user_id` ligado a `profiles`). Venda de convidado nunca gera XP.
- Data de cadastro = `profiles.created_at` (conferido: igual a `auth.users.created_at` e a `customers.account_created_at` em 100% dos casos).
- Nada anterior ao cadastro conta: compra é elegível se `sales.created_at >= cadastro`; check-in se `checked_in_at >= cadastro` e o ingresso é de compra elegível. Sem retroativo e sem associar vendas antigas por nome/telefone.
- Compra elegível: `status = 'pago'` e não cortesia. Pendente, expirada, cancelada e reembolsada não geram XP.

## Interpretação de cada regra
- **Ordem das compras:** `coalesce(paid_at, created_at)`. `updated_at` não é usado (muda com edições posteriores).
- **Primeira compra:** a mais antiga paga e elegível do cliente. **Compra adicional:** 2ª compra em diante do mesmo cliente no mesmo evento.
- **Primeiro comprador:** 1ª compra elegível do evento (qualquer cliente com conta). Chave única por evento + índice único = nunca duplica. Se esse comprador cancelar/reembolsar, o bônus passa ao próximo.
- **Primeiro dia:** abertura das vendas = menor `starts_at` entre os lotes de **venda** (cortesia não conta). Vale se a compra foi criada depois da abertura e no mesmo dia (horário de São Paulo). Evento sem lote com data de início: sem esse bônus (não há dado de abertura; não inventamos).
- **Grupo:** `sales.quantity >= 3` na mesma transação, somado aos +200.
- **Check-in:** +50 por cliente e evento (o 1º ingresso utilizado); mais ingressos do mesmo evento não repetem.
- **Fidelidade:** eventos `publicado` com `event_date <= agora`, em ordem de data. O cliente precisa ter compra elegível + check-in válido em 3 consecutivos dessa sequência. **Regra anti-duplicidade:** +200 a cada bloco de 3 consecutivos (3º, 6º, 9º evento da sequência), com chave `loyalty:<cliente>:<evento do 3º>`. Falta ou evento sem check-in quebra a sequência; evento futuro não conta; reprocessar não repete.

## Cancelamentos e estornos
O ledger é reconstruído a partir do estado real: venda paga que vira cancelada/reembolsada perde seus pontos na hora (o gatilho de vendas dispara o recálculo).

## Idempotência e concorrência
- Cada linha tem `source_key` única (índice único parcial). `rebuild_customer_xp()` insere o que falta, corrige o que mudou e remove o que deixou de valer; a 2ª execução devolve `0/0/0`.
- Uma reconstrução por vez (`pg_advisory_xact_lock`).
- Falha no cálculo de XP vira `WARNING` e nunca desfaz um pagamento ou check-in; rode `rebuild_customer_xp()` depois.

## Segurança
- Leitura de `customer_xp_events`/`customer_xp_totals`: o próprio cliente ou admin/colaborador (antes, qualquer cliente logado lia o XP de todos).
- `anon`/`authenticated` sem escrita. `rebuild_customer_xp()` e `xp_expected_ledger()` só para `service_role`.
- `SECURITY DEFINER` só nos gatilhos (quem dispara, como operador de check-in, não pode escrever no ledger), com `search_path` fixo e sem EXECUTE público.

## Histórico e recuperação
- `customer_xp_events_archive`: ledger da v1 (342 linhas, 34.000 XP), só auditoria.
- `customer_xp_events_snapshot_v2`: cópia do ledger v2 feita pela migration v3. Sem acesso pela API.
- Desfazer a v3: `supabase/rollbacks/...rollback.sql`.

## Limitações conhecidas
- 1 cliente com conta sem linha em `profiles` não recebe XP (sem data de cadastro confiável). Não inventamos a data.
- Recalcular é global: custo cresce com o volume (hoje ~250 linhas, instantâneo). Reavaliar acima de dezenas de milhares de vendas.
- Fidelidade só é recalculada quando algo dispara o gatilho (check-in, venda, evento). Um evento que "passa a estar concluído" só pelo relógio é contado no próximo gatilho ou em `rebuild_customer_xp()` manual.
- Resgate de XP por brindes **não** está implementado. O ledger aceita linhas futuras de resgate (valor negativo) sem mexer nas de ganho (o recálculo só toca nos 9 motivos de ganho; o `check` de motivos precisará de um motivo novo).
