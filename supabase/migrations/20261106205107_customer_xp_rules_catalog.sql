-- Catálogo somente de leitura para exibir as regras oficiais de XP ao cliente.
-- Os valores vêm de xp_rule_amount(), a mesma fonte usada pelo ledger.

create or replace function public.get_customer_xp_rules()
returns table (
  reason text,
  label text,
  description text,
  points integer,
  sort_order integer
)
language sql
stable
security invoker
set search_path = public
as $fn$
  select rules.reason, rules.label, rules.description,
         public.xp_rule_amount(rules.reason) as points,
         rules.sort_order
  from (values
    ('criar_conta', 'Criação da conta', 'Ao criar sua conta no TicketFlow.', 1),
    ('primeira_compra', 'Primeira compra', 'Bônus concedido uma única vez, na sua primeira compra paga elegível.', 2),
    ('compra_ingresso', 'Compra de ingressos', 'A cada compra paga elegível, independentemente da quantidade de ingressos.', 3),
    ('comparecimento', 'Comparecimento', 'Ao validar seu ingresso no check-in do evento. Conta uma vez por evento.', 4),
    ('primeiro_comprador', 'Primeiro comprador', 'Para a primeira compra paga elegível registrada em cada evento.', 5),
    ('compra_primeiro_dia', 'Compra no primeiro dia de vendas', 'Para compras feitas no dia em que as vendas dos lotes regulares são abertas.', 6),
    ('compra_adicional', 'Compra adicional no mesmo evento', 'A partir da segunda compra paga elegível que você fizer para o mesmo evento.', 7),
    ('compra_grupo', 'Compra em grupo', 'Bônus adicional em uma única compra de 3 ou mais ingressos.', 8),
    ('fidelidade', 'Fidelidade', 'A cada sequência de 3 eventos consecutivos concluídos com compra paga e check-in válido em todos eles.', 9)
  ) as rules(reason, label, description, sort_order)
  order by rules.sort_order;
$fn$;

revoke all on function public.get_customer_xp_rules() from public, anon;
grant execute on function public.get_customer_xp_rules() to authenticated;

comment on function public.get_customer_xp_rules() is
  'Lista informativa das regras oficiais de XP; os valores são obtidos de xp_rule_amount(). Não altera o ledger.';
