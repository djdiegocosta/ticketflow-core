-- Preferência "Unificar listas de PDF de check-in" (ligada = Vendas e Cortesias saem numa lista só).
alter table public.organizations
  add column if not exists unify_checkin_pdf boolean not null default true;
