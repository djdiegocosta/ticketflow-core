-- Página pública de vendas: exibir TODOS os lotes ativos ao mesmo tempo.
--
-- Antes: a função liberava os lotes em fila (o lote N só aparecia quando todos os
-- anteriores estavam esgotados ou vencidos). Com dois lotes ativos no mesmo período
-- (ex.: "1º Lote" e "Lote Especial"), só um aparecia para o cliente.
--
-- Agora: aparece todo lote de venda (não cortesia) que esteja dentro do período
-- configurado (starts_at/ends_at) e com estoque. Regras preservadas:
--   - datas: starts_at <= agora <= ends_at (NULL = sem limite daquele lado);
--   - estoque: quantity > 0 (NULL = sem limite de estoque);
--   - lotes de cortesia nunca entram na venda pública;
--   - mesma assinatura, mesmas colunas e mesmos grants (CREATE OR REPLACE).
-- Ordem: início do lote; em empate (lotes criados juntos), o mais barato primeiro,
-- para o lote selecionado por padrão ser o de menor preço.
--
-- O checkout (create_pending_sale) já valida o lote escolhido de forma independente
-- (evento publicado, lote do evento, não cortesia, período, preço do lote e baixa de
-- estoque atômica), por isso não depende da ordem de liberação dos lotes.
CREATE OR REPLACE FUNCTION public.get_available_batches(_event_id uuid)
 RETURNS TABLE(id uuid, event_id uuid, organization_id uuid, name text, price numeric, quantity integer, starts_at timestamp with time zone, ends_at timestamp with time zone, is_courtesy boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.id, b.event_id, b.organization_id, b.name, b.price, b.quantity, b.starts_at, b.ends_at,
         b.is_courtesy, b.created_at, b.updated_at
  FROM public.ticket_batches b
  WHERE b.event_id = _event_id
    AND NOT b.is_courtesy
    AND (b.starts_at IS NULL OR b.starts_at <= now())
    AND (b.ends_at IS NULL OR b.ends_at >= now())
    AND (b.quantity IS NULL OR b.quantity > 0)
  ORDER BY COALESCE(b.starts_at, b.created_at), b.price, b.name;
$function$;
