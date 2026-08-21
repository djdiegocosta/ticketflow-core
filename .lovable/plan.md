---
name: Auditoria - Vitrine na Tela Inicial do Cliente
description: Diagnóstico da falha na exibição de banners ativos na área do cliente.
type: feature
---

# Diagnóstico de Auditoria - Vitrine do Cliente

## 1. Diagnóstico
O banner ativo não está sendo exibido na tela `/cliente` devido a um provável problema de **RLS (Row Level Security)** na tabela `client_banners`. Embora a tabela exista, contenha dados corretos (incluindo `organization_id` e `is_active: true`) e o frontend esteja chamando o hook `useActiveBanner`, as políticas de segurança do Supabase para o papel `authenticated` (que o cliente possui) podem não estar permitindo a leitura dos registros, ou o vínculo do cliente com a organização não está sendo resolvido corretamente no momento da consulta.

## 2. Ponto de Falha
O problema está localizado na camada de **RLS / Consulta ao Banco**.
- **Cadastro**: OK (Banners são salvos corretamente via Admin).
- **Banco**: OK (Dados persistem com `is_active: true` e `organization_id` válido).
- **Storage**: OK (URL pública gerada e funcional).
- **Componente**: OK (Renderiza condicionalmente baseado no estado `banner`).
- **Estado/Consulta**: Falha (A query retorna `null` ou vazio, impedindo a renderização).

## 3. Evidências
- **Tabela `client_banners`**: Possui o registro `41d112cb...` com `is_active: true` vinculado à organização `07ac211b...`.
- **`src/lib/customer-queries.ts`**: O hook `useActiveBanner` filtra por `organization_id`. Se a RLS não permitir que o cliente veja registros dessa tabela, o Supabase retorna vazio.
- **`src/components/cliente/ClientVitrine.tsx`**: O código `if (!banner) return null;` (Linha 13) silencia a exibição se a query falhar ou retornar vazio.
- **`src/routes/cliente.index.tsx`**: O componente `<ClientVitrine />` está montado, mas não aparece no preview.

## 4. Correção Necessária
1. **Permissões RLS**: Garantir que a tabela `client_banners` possua uma política de `SELECT` para usuários `authenticated`.
   ```sql
   GRANT SELECT ON public.client_banners TO authenticated;
   CREATE POLICY "Users can view banners for their organization" ON public.client_banners
   FOR SELECT TO authenticated USING (true); -- Ou filtrar por organization_id se houver vínculo direto
   ```
2. **Vínculo do Cliente**: Verificar se o hook `useCurrentCustomer` está retornando o `organization_id` corretamente para o usuário logado. Se o `customer` vier sem `organization_id`, a query do banner será desabilitada (`enabled: !!customer?.organization_id`).

### Próximos Passos
1. Validar políticas de RLS no banco de dados.
2. Garantir que o perfil do cliente no Supabase tenha o campo `organization_id` preenchido.
3. Se o RLS estiver ok, verificar se a query do banner no hook `useActiveBanner` precisa ser ajustada para ignorar filtros restritivos demais.
